using System;
using System.IO;
using System.Linq;
using UAssetAPI;
using UAssetAPI.UnrealTypes;
using UAssetAPI.ExportTypes;
using UAssetAPI.PropertyTypes.Objects;
using UAssetAPI.PropertyTypes.Structs;
using UAssetAPI.Unversioned;

namespace MaterialInspector
{
    class Program
    {
        static void Main(string[] args)
        {
            if (args.Length == 0)
            {
                Console.WriteLine("Usage: MaterialInspector <uasset_path> [usmap_path]");
                return;
            }

            string uassetPath = args[0];
            string? usmapPath = args.Length > 1 ? args[1] : null;

            try
            {
                // Load the asset
                UAsset asset = new UAsset(uassetPath, EngineVersion.VER_UE5_3);

                // Load usmap if provided
                if (!string.IsNullOrEmpty(usmapPath) && File.Exists(usmapPath))
                {
                    var mappings = new Usmap(usmapPath);
                    asset.Mappings = mappings;
                }

                Console.WriteLine($"=== Inspecting: {Path.GetFileName(uassetPath)} ===");
                Console.WriteLine($"Total Imports: {asset.Imports.Count}");
                Console.WriteLine($"Total Exports: {asset.Exports.Count}\n");

                // Find StaticMesh exports
                for (int i = 0; i < asset.Exports.Count; i++)
                {
                    var export = asset.Exports[i];
                    
                    if (export is NormalExport normalExport)
                    {
                        // Look for StaticMaterials property
                        var staticMaterialsProp = normalExport.Data.FirstOrDefault(p => 
                            p.Name?.ToString() == "StaticMaterials");

                        if (staticMaterialsProp is ArrayPropertyData arrayProp)
                        {
                            Console.WriteLine($"Export: {export.ObjectName}");
                            Console.WriteLine($"Type: StaticMesh");
                            Console.WriteLine($"StaticMaterials: {arrayProp.Value.Length} material slot(s)\n");

                            for (int slotIdx = 0; slotIdx < arrayProp.Value.Length; slotIdx++)
                            {
                                Console.WriteLine($"--- Material Slot {slotIdx} ---");

                                if (arrayProp.Value[slotIdx] is StructPropertyData structProp)
                                {
                                    // Get MaterialSlotName
                                    var slotNameProp = structProp.Value.FirstOrDefault(p => 
                                        p.Name?.ToString() == "MaterialSlotName");
                                    string slotName = "NULL";
                                    if (slotNameProp is NamePropertyData nameProp)
                                    {
                                        slotName = nameProp.Value?.ToString() ?? "NULL";
                                    }

                                    // Get ImportedMaterialSlotName  
                                    var importedSlotNameProp = structProp.Value.FirstOrDefault(p =>
                                        p.Name?.ToString() == "ImportedMaterialSlotName");
                                    string importedSlotName = "NULL";
                                    if (importedSlotNameProp is NamePropertyData importedNameProp)
                                    {
                                        importedSlotName = importedNameProp.Value?.ToString() ?? "NULL";
                                    }

                                    // Get MaterialInterface
                                    var materialInterfaceProp = structProp.Value.FirstOrDefault(p => 
                                        p.Name?.ToString() == "MaterialInterface");

                                    Console.WriteLine($"MaterialSlotName: {slotName}");
                                    Console.WriteLine($"ImportedMaterialSlotName: {importedSlotName}");

                                    if (materialInterfaceProp is ObjectPropertyData objProp)
                                    {
                                        if (objProp.Value.IsNull())
                                        {
                                            Console.ForegroundColor = ConsoleColor.Red;
                                            Console.WriteLine("MaterialInterface: NULL");
                                            Console.ResetColor();
                                        }
                                        else
                                        {
                                            int index = objProp.Value.Index;
                                            Console.ForegroundColor = ConsoleColor.Green;
                                            Console.WriteLine($"MaterialInterface: {index}");
                                            
                                            // If it's an import, show what it points to
                                            if (index < 0)
                                            {
                                                int importIndex = (-index) - 1;
                                                if (importIndex < asset.Imports.Count)
                                                {
                                                    var import = asset.Imports[importIndex];
                                                    Console.WriteLine($"  → Import: {import.ObjectName}");
                                                    Console.WriteLine($"  → Class: {import.ClassName}");
                                                    Console.WriteLine($"  → Package: {import.ClassPackage}");
                                                }
                                            }
                                            Console.ResetColor();
                                        }
                                    }
                                    else
                                    {
                                        Console.ForegroundColor = ConsoleColor.Yellow;
                                        Console.WriteLine("MaterialInterface: NOT FOUND");
                                        Console.ResetColor();
                                    }

                                    Console.WriteLine();
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"Error: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                Console.ResetColor();
            }
        }

    }
}
