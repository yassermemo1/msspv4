"use strict";
// TODO: Re-enable when DataSourceMapping is added to schema
// import { DataSourceMapping } from "@shared/schema";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyMappings = applyMappings;
function applyMappings(data, mappings) {
    if (!mappings || mappings.length === 0) {
        return data;
    }
    const mappingObject = mappings.reduce((acc, mapping) => {
        acc[mapping.sourceField] = mapping.targetField;
        return acc;
    }, {});
    return data.map(item => {
        const mappedItem = {};
        for (const sourceField in item) {
            if (Object.prototype.hasOwnProperty.call(item, sourceField)) {
                const targetField = mappingObject[sourceField];
                if (targetField) {
                    mappedItem[targetField] = item[sourceField];
                }
                else {
                    // Keep unmapped fields as is, or you could choose to omit them
                    mappedItem[sourceField] = item[sourceField];
                }
            }
        }
        return mappedItem;
    });
}
