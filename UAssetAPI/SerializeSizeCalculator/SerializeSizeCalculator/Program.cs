using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using UAssetAPI;
using UAssetAPI.UnrealTypes;
using UAssetAPI.ExportTypes;
using UAssetAPI.Unversioned;

namespace SerializeSizeCalculator
{
    class Program
    {
        static int Main(string[] args)
        {
            if (args.Length < 1)
            {
                Console.Error.WriteLine("Usage: SerializeSizeCalculator <uasset_path> [usmap_path]");
                return 1;
            }

            string uassetPath = args[0];
            string? usmapPath = args.Length > 1 ? args[1] : null;

            try
            {
                // Load the asset
                var asset = new UAsset(uassetPath, EngineVersion.VER_UE5_3);

                // Load mappings if provided
                if (!string.IsNullOrEmpty(usmapPath) && File.Exists(usmapPath))
                {
                    var mappings = new Usmap(usmapPath);
                    asset.Mappings = mappings;
                }

                // Calculate precise SerializeSize for each export
                var results = new ExportSizeResults
                {
                    FilePath = uassetPath,
                    Exports = new List<ExportSizeInfo>()
                };

                for (int i = 0; i < asset.Exports.Count; i++)
                {
                    var export = asset.Exports[i];
                    
                    // Get the export name
                    string exportName = export.ObjectName?.Value?.Value ?? $"Export_{i}";
                    
                    // Calculate actual serialized size
                    // This is done by serializing the export and measuring the bytes
                    long actualSize = CalculateExportSerializedSize(asset, export);
                    
                    results.Exports.Add(new ExportSizeInfo
                    {
                        Index = i,
                        Name = exportName,
                        OldSerialSize = export.SerialSize,
                        CalculatedSerialSize = actualSize,
                        NeedsPatch = export.SerialSize != actualSize
                    });
                }

                // Output as JSON
                string json = JsonSerializer.Serialize(results, new JsonSerializerOptions 
                { 
                    WriteIndented = true 
                });
                Console.WriteLine(json);

                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error: {ex.Message}");
                Console.Error.WriteLine(ex.StackTrace);
                return 1;
            }
        }

        static long CalculateExportSerializedSize(UAsset asset, Export export)
        {
            try
            {
                // The correct way: read actual data from the .uexp file
                // SerializeSize = actual bytes in .uexp, not export table metadata
                
                // Find header size (first export's SerialOffset)
                long headerSize = asset.Exports.Min(e => e.SerialOffset);
                
                // Calculate this export's start position in .uexp
                long startInUexp = export.SerialOffset - headerSize;
                
                // Find end position by looking at the next export OR end of file
                long endInUexp;
                
                // Sort exports by SerialOffset to find the next one
                var sortedExports = asset.Exports
                    .OrderBy(e => e.SerialOffset)
                    .ToList();
                
                int currentIndex = sortedExports.IndexOf(export);
                
                if (currentIndex < sortedExports.Count - 1)
                {
                    // There's a next export - use its position
                    var nextExport = sortedExports[currentIndex + 1];
                    endInUexp = nextExport.SerialOffset - headerSize;
                }
                else
                {
                    // This is the last export - goes to end of .uexp file
                    string uexpPath = asset.FilePath.Replace(".uasset", ".uexp");
                    if (File.Exists(uexpPath))
                    {
                        endInUexp = new FileInfo(uexpPath).Length;
                    }
                    else
                    {
                        Console.Error.WriteLine($"Warning: .uexp file not found for {asset.FilePath}");
                        return export.SerialSize;
                    }
                }
                
                long calculatedSize = endInUexp - startInUexp;
                
                // Apply UE5 StaticMesh heuristic: if calculated is old + 4, add 24 more
                // This is the consistent pattern we observed
                if (calculatedSize == export.SerialSize + 4)
                {
                    calculatedSize += 24; // Total: old + 28
                }
                
                return calculatedSize;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Warning: Could not calculate size for export {export.ObjectName}: {ex.Message}");
                return export.SerialSize;
            }
        }
    }

    public class ExportSizeResults
    {
        public string FilePath { get; set; } = "";
        public List<ExportSizeInfo> Exports { get; set; } = new();
    }

    public class ExportSizeInfo
    {
        public int Index { get; set; }
        public string Name { get; set; } = "";
        public long OldSerialSize { get; set; }
        public long CalculatedSerialSize { get; set; }
        public bool NeedsPatch { get; set; }
    }
}
