using System;
using System.IO;
using System.Linq;
using UAssetAPI;
using UAssetAPI.UnrealTypes;
using UAssetAPI.ExportTypes;
using UAssetAPI.PropertyTypes.Objects;
using UAssetAPI.PropertyTypes.Structs;
using UAssetAPI.Unversioned;

namespace MaterialReferenceFixer
{
    class Program
    {
        static int Main(string[] args)
        {
            if (args.Length < 1)
            {
                Console.WriteLine("Usage: MaterialReferenceFixer <uasset_path> [usmap_path]");
                Console.WriteLine("Strips MaterialInterface references from StaticMesh, forcing game to use MaterialSlotName");
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
                    Console.WriteLine($"Loaded mappings from: {usmapPath}");
                }

                bool modified = false;

                // Find StaticMesh exports
                for (int i = 0; i < asset.Exports.Count; i++)
                {
                    var export = asset.Exports[i];
                    
                    if (export is NormalExport normalExport)
                    {
                        Console.WriteLine($"Checking export at index {i}: {export.ObjectName}");
                        Console.WriteLine($"  Export has {normalExport.Data.Count} properties");
                        
                        // Find StaticMaterials property
                        var staticMaterialsProp = normalExport.Data.FirstOrDefault(p => 
                            p.Name?.ToString() == "StaticMaterials");
                        
                        if (staticMaterialsProp == null)
                        {
                            Console.WriteLine($"  No StaticMaterials property found");
                            continue;
                        }
                        
                        Console.WriteLine($"  Found StaticMaterials property");
                        
                        if (staticMaterialsProp is ArrayPropertyData arrayProp)
                        {
                            Console.WriteLine($"  Found StaticMaterials array with {arrayProp.Value.Length} entries");
                            
                            foreach (var materialEntry in arrayProp.Value)
                            {
                                if (materialEntry is StructPropertyData structProp)
                                {
                                    // Find MaterialSlotName to see what the game will look for
                                    var materialSlotNameProp = structProp.Value.FirstOrDefault(p => 
                                        p.Name?.ToString() == "MaterialSlotName");
                                    
                                    string slotName = "UNKNOWN";
                                    if (materialSlotNameProp is NamePropertyData nameProp)
                                    {
                                        slotName = nameProp.Value?.ToString() ?? "NULL";
                                    }
                                    
                                    Console.WriteLine($"    Original MaterialSlotName: {slotName}");
                                    
                                    // Find MaterialInterface property in the struct
                                    var materialInterfaceProp = structProp.Value.FirstOrDefault(p => 
                                        p.Name?.ToString() == "MaterialInterface");
                                    
                                    // CRITICAL FIX: Change MaterialInterface to WorldGridMaterial (like working weapons)
                                    // Keep MaterialSlotName unchanged so game finds the right material
                                    if (materialInterfaceProp is ObjectPropertyData objProp)
                                    {
                                        // Check if MaterialInterface points to something other than WorldGridMaterial
                                        string currentInterface = objProp.Value.ToString();
                                        
                                        if (!currentInterface.Contains("WorldGridMaterial") && !objProp.Value.IsNull())
                                        {
                                            string oldValue = currentInterface;
                                            
                                            // Look for existing WorldGridMaterial import
                                            int worldGridImportIndex = -1;
                                            for (int j = 0; j < asset.Imports.Count; j++)
                                            {
                                                if (asset.Imports[j].ObjectName?.ToString() == "WorldGridMaterial")
                                                {
                                                    worldGridImportIndex = -(j + 1); // Import indices are negative
                                                    break;
                                                }
                                            }
                                            
                                            if (worldGridImportIndex != -1)
                                            {
                                                objProp.Value = new FPackageIndex(worldGridImportIndex);
                                                Console.WriteLine($"    ✓ Changed MaterialInterface: {oldValue}");
                                                Console.WriteLine($"       → WorldGridMaterial (import index {worldGridImportIndex})");
                                                Console.WriteLine($"    → Game will look for material by name: {slotName}");
                                                modified = true;
                                            }
                                            else
                                            {
                                                Console.WriteLine($"    ⚠ WorldGridMaterial import not found in asset");
                                                Console.WriteLine($"       MaterialInterface kept as: {oldValue}");
                                                Console.WriteLine($"       This may cause material loading issues!");
                                            }
                                        }
                                        else if (currentInterface.Contains("WorldGridMaterial"))
                                        {
                                            Console.WriteLine($"    ✓ MaterialInterface already set to WorldGridMaterial");
                                        }
                                        else if (objProp.Value.IsNull())
                                        {
                                            Console.WriteLine($"    ⚠ MaterialInterface is null - this may cause issues");
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (modified)
                {
                    // Save the modified asset
                    asset.Write(uassetPath);
                    Console.WriteLine($"\n✓ Successfully modified: {uassetPath}");
                    Console.WriteLine("Material references stripped - game will now use MaterialSlotName");
                    return 0;
                }
                else
                {
                    Console.WriteLine("\nNo MaterialInterface references found to strip");
                    return 0;
                }
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
