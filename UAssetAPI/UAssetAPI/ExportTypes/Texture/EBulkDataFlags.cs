using System;

namespace UAssetAPI.ExportTypes.Texture
{
    /// <summary>
    /// Flags serialized with bulk data.
    /// Ported from CUE4Parse and UE4-DDS-Tools.
    /// </summary>
    [Flags]
    public enum EBulkDataFlags : uint
    {
        BULKDATA_None = 0,
        /// <summary>If set, payload is stored at the end of the file and not inline.</summary>
        BULKDATA_PayloadAtEndOfFile = 1 << 0,
        /// <summary>If set, payload should be memory-mapped for loading.</summary>
        BULKDATA_SerializeCompressedZLIB = 1 << 1,
        /// <summary>Bulk data is compressed using GZIP.</summary>
        BULKDATA_SerializeCompressedGZIP = 1 << 2,
        /// <summary>Bulk data will not be loaded at all.</summary>
        BULKDATA_Unused = 1 << 5,
        /// <summary>Bulk data is stored in a separate file (.ubulk).</summary>
        BULKDATA_PayloadInSeperateFile = 1 << 6,
        /// <summary>Bulk data is stored inline and should be serialized with the rest of the export.</summary>
        BULKDATA_ForceInlinePayload = 1 << 7,
        /// <summary>Bulk data is compressed using LZ4.</summary>
        BULKDATA_SerializeCompressedLZ4 = 1 << 8,
        /// <summary>Bulk data is stored in a separate file (.uptnl).</summary>
        BULKDATA_OptionalPayload = 1 << 11,
        /// <summary>Bulk data can be loaded lazily.</summary>
        BULKDATA_LazyLoadable = 1 << 12,
        /// <summary>Bulk data is stored in memory-mapped file.</summary>
        BULKDATA_MemoryMappedPayload = 1 << 13,
        /// <summary>Size is 64-bit.</summary>
        BULKDATA_Size64Bit = 1 << 14,
        /// <summary>Duplicate non-optional payload that was stored in optional storage.</summary>
        BULKDATA_DuplicateNonOptionalPayload = 1 << 15,
        /// <summary>Indicates that an old ID is present.</summary>
        BULKDATA_BadDataVersion = 1 << 16,
        /// <summary>Indicates that the bulk data does not have a FIoChunkId.</summary>
        BULKDATA_NoOffsetFixUp = 1 << 17,
        /// <summary>Indicates that the bulk data uses the new cooked index system (UE5.3+).</summary>
        BULKDATA_UsesIoDispatcher = 1 << 18,
        /// <summary>Indicates that the bulk data is stored in a data resource.</summary>
        BULKDATA_DataIsMemoryMapped = 1 << 19,
        /// <summary>Indicates that the bulk data has a separate bulk data ID.</summary>
        BULKDATA_HasSeparateBulkDataId = 1 << 20,
    }
}
