// TODO: Re-enable when DataSourceMapping is added to schema
// import { DataSourceMapping } from "@shared/schema";

export function applyMappings(data: any[], mappings: any[]): any[] {
  if (!mappings || mappings.length === 0) {
    return data;
  }

  const mappingObject = mappings.reduce((acc, mapping) => {
    acc[mapping.sourceField] = mapping.targetField;
    return acc;
  }, {} as { [key: string]: string });

  return data.map(item => {
    const mappedItem: { [key: string]: any } = {};
    for (const sourceField in item) {
      if (Object.prototype.hasOwnProperty.call(item, sourceField)) {
        const targetField = mappingObject[sourceField];
        if (targetField) {
          mappedItem[targetField] = item[sourceField];
        } else {
          // Keep unmapped fields as is, or you could choose to omit them
          mappedItem[sourceField] = item[sourceField];
        }
      }
    }
    return mappedItem;
  });
} 