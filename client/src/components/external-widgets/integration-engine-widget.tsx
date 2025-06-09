import React from 'react';

interface IntegrationEngineWidgetProps {
  className?: string;
  config?: Record<string, any>;
  data?: any;
}

const IntegrationEngineWidget: React.FC<IntegrationEngineWidgetProps> = ({ 
  className,
  config,
  data 
}) => {
  return (
    <div className={`integration-engine-widget ${className || ''}`}>
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="text-lg font-semibold mb-2">Integration Engine Widget</h3>
        <p className="text-muted-foreground mb-4">
          Integration engine functionality will be displayed here.
        </p>
        {config && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Configuration:</h4>
            <pre className="text-xs bg-muted p-2 rounded">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        )}
        {data && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Data:</h4>
            <pre className="text-xs bg-muted p-2 rounded">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationEngineWidget;
export { IntegrationEngineWidget }; 