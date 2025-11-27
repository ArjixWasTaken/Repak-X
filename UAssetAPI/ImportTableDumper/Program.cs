using System;
using System.IO;
using UAssetAPI;
using UAssetAPI.UnrealTypes;
using UAssetAPI.Unversioned;

namespace ImportTableDumper
{
    class Program
    {
        static int Main(string[] args)
        {
            if (args.Length < 1)
            {
                Console.WriteLine("Usage: ImportTableDumper <uasset_path> [usmap_path]");
                Console.WriteLine("Dumps the import table to see material references");
                return 1;
            }

            string uassetPath = args[0];
            string? usmapPath = args.Length > 1 ? args[1] : null;

            try
            {
                if (!File.Exists(uassetPath))
                {
                    Console.Error.WriteLine($"File not found: {uassetPath}");
                    return 1;
                }

                // Load the asset
                UAsset asset = new UAsset(uassetPath, EngineVersion.VER_UE5_3);
                
                // Load mappings if provided
                if (!string.IsNullOrEmpty(usmapPath) && File.Exists(usmapPath))
                {
                    var mappings = new Usmap(usmapPath);
                    asset.Mappings = mappings;
                }

                Console.WriteLine($"Import Table for: {Path.GetFileName(uassetPath)}");
                Console.WriteLine($"Total Imports: {asset.Imports.Count}");
                Console.WriteLine();

                for (int i = 0; i < asset.Imports.Count; i++)
                {
                    var import = asset.Imports[i];
                    Console.WriteLine($"Import [{i}]:");
                    Console.WriteLine($"  ObjectName: {import.ObjectName}");
                    Console.WriteLine($"  ClassName: {import.ClassName}");
                    Console.WriteLine($"  ClassPackage: {import.ClassPackage}");
                    Console.WriteLine($"  OuterIndex: {import.OuterIndex}");
                    
                    Console.WriteLine();
                }

                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error: {ex.Message}");
                Console.Error.WriteLine(ex.StackTrace);
                return 1;
            }
        }
    }
}
