// UI Selector Debug Tool - Development Only
// Allows clicking on UI elements to get detailed component information
// Perfect for sharing debugging info with AI assistants

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Target, 
  Copy, 
  X, 
  Info, 
  Bug, 
  Code, 
  Eye,
  EyeOff,
  MousePointer
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComponentInfo {
  tagName: string;
  className: string;
  id: string;
  textContent: string;
  attributes: Record<string, string>;
  computedStyles: Record<string, string>;
  position: { x: number; y: number; width: number; height: number };
  reactProps?: Record<string, any>;
  errorBoundary?: string;
  parentChain: string[];
  dataAttributes: Record<string, string>;
}

interface UISelector {
  isActive: boolean;
  selectedElement: ComponentInfo | null;
  hoveredElement: Element | null;
}

export function UISelector() {
  const [state, setState] = useState<UISelector>({
    isActive: false,
    selectedElement: null,
    hoveredElement: null
  });

  // Debug log to ensure component loads
  useEffect(() => {
    console.log('🐛 UI Selector Debug Tool loaded');
    console.log('🐛 Current state:', state);
  }, []);
  
  const overlayRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Extract comprehensive component information
  const extractComponentInfo = useCallback((element: Element): ComponentInfo => {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    // Get all attributes
    const attributes: Record<string, string> = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }

    // Get data attributes specifically
    const dataAttributes: Record<string, string> = {};
    Object.keys(attributes).forEach(key => {
      if (key.startsWith('data-')) {
        dataAttributes[key] = attributes[key];
      }
    });

    // Get important computed styles
    const importantStyles = [
      'display', 'position', 'top', 'left', 'width', 'height',
      'margin', 'padding', 'border', 'background', 'color',
      'font-family', 'font-size', 'z-index', 'visibility', 'opacity'
    ];
    
    const computedStyles: Record<string, string> = {};
    importantStyles.forEach(prop => {
      computedStyles[prop] = computedStyle.getPropertyValue(prop);
    });

    // Build parent chain
    const parentChain: string[] = [];
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      const className = typeof parent.className === 'string' ? parent.className : '';
      const parentDesc = `${parent.tagName.toLowerCase()}${parent.id ? '#' + parent.id : ''}${className ? '.' + className.split(' ').join('.') : ''}`;
      parentChain.push(parentDesc);
      parent = parent.parentElement;
      depth++;
    }

    // Try to get React props (this is tricky and might not always work)
    const reactProps: Record<string, any> = {};
    try {
      // Look for React fiber
      const fiberKey = Object.keys(element).find(key => 
        key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber')
      );
      
      if (fiberKey) {
        const fiber = (element as any)[fiberKey];
        if (fiber && fiber.memoizedProps) {
          Object.keys(fiber.memoizedProps).forEach(prop => {
            if (typeof fiber.memoizedProps[prop] !== 'function') {
              reactProps[prop] = fiber.memoizedProps[prop];
            } else {
              reactProps[prop] = '[Function]';
            }
          });
        }
      }
    } catch (e) {
      // React props extraction failed, that's okay
    }

    return {
      tagName: element.tagName.toLowerCase(),
      className: (typeof element.className === 'string' ? element.className : '') || '',
      id: element.id || '',
      textContent: element.textContent?.slice(0, 100) || '',
      attributes,
      computedStyles,
      position: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      },
      reactProps: Object.keys(reactProps).length > 0 ? reactProps : undefined,
      parentChain,
      dataAttributes
    };
  }, []);

  // Handle element selection
  const handleElementClick = useCallback((e: MouseEvent) => {
    if (!state.isActive) return;
    
    const target = e.target as Element;
    
    // Check if click is on debug buttons or their children
    if (target.closest('[data-ui-selector-ignore]') || 
        target.closest('[data-debug-ignore]') ||
        target.closest('button')) {
      return; // Don't prevent default, let the button click work normally
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    const componentInfo = extractComponentInfo(target);
    setState(prev => ({ ...prev, selectedElement: componentInfo }));
  }, [state.isActive, extractComponentInfo]);

  // Handle element hover
  const handleElementHover = useCallback((e: MouseEvent) => {
    if (!state.isActive) return;
    
    const target = e.target as Element;
    
    // Don't highlight debug buttons
    if (target.closest('[data-ui-selector-ignore]') || 
        target.closest('[data-debug-ignore]') ||
        target.closest('button')) {
      setState(prev => ({ ...prev, hoveredElement: null }));
      return;
    }
    
    // Only set hovered element if it's a valid element
    if (target && target.tagName) {
      setState(prev => ({ ...prev, hoveredElement: target }));
    }
  }, [state.isActive]);

  // Event listeners
  useEffect(() => {
    if (state.isActive) {
      document.addEventListener('click', handleElementClick, true);
      document.addEventListener('mouseover', handleElementHover);
      document.body.style.cursor = 'crosshair';
      
      return () => {
        document.removeEventListener('click', handleElementClick, true);
        document.removeEventListener('mouseover', handleElementHover);
        document.body.style.cursor = '';
      };
    }
  }, [state.isActive, handleElementClick, handleElementHover]);

  // Keyboard shortcut (Ctrl/Cmd + Shift + D) and Escape to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'D' && e.shiftKey && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        console.log('🐛 UI Selector keyboard shortcut triggered');
        setState(prev => ({ 
          ...prev, 
          isActive: !prev.isActive,
          selectedElement: prev.isActive ? null : prev.selectedElement
        }));
      } else if (e.key === 'Escape' && state.isActive) {
        e.preventDefault();
        console.log('🐛 UI Selector disabled via Escape key');
        setState(prev => ({ 
          ...prev, 
          isActive: false,
          selectedElement: null
        }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.isActive]);

  // Copy to clipboard
  const copyDebugInfo = async () => {
    if (!state.selectedElement) return;
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      component: state.selectedElement,
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    const formattedInfo = `
# UI Component Debug Info
**Timestamp:** ${debugInfo.timestamp}
**URL:** ${debugInfo.url}

## Component Details
**Tag:** ${debugInfo.component.tagName}
**ID:** ${debugInfo.component.id || 'None'}
**Classes:** ${debugInfo.component.className || 'None'}
**Text Content:** ${debugInfo.component.textContent || 'Empty'}

## Position & Size
**X:** ${debugInfo.component.position.x}px
**Y:** ${debugInfo.component.position.y}px  
**Width:** ${debugInfo.component.position.width}px
**Height:** ${debugInfo.component.position.height}px

## Attributes
${Object.entries(debugInfo.component.attributes).map(([key, value]) => `**${key}:** ${value}`).join('\n')}

## Data Attributes
${Object.entries(debugInfo.component.dataAttributes).map(([key, value]) => `**${key}:** ${value}`).join('\n') || 'None'}

## Key Computed Styles
${Object.entries(debugInfo.component.computedStyles).map(([key, value]) => `**${key}:** ${value}`).join('\n')}

## Parent Chain
${debugInfo.component.parentChain.map((parent, i) => `${i + 1}. ${parent}`).join('\n')}

${debugInfo.component.reactProps ? `## React Props
${Object.entries(debugInfo.component.reactProps).map(([key, value]) => `**${key}:** ${JSON.stringify(value)}`).join('\n')}` : ''}

## Browser Info  
**User Agent:** ${debugInfo.userAgent}
**Viewport:** ${debugInfo.viewport.width}x${debugInfo.viewport.height}

---
*Generated by UI Selector Debug Tool*
    `.trim();
    
    try {
      await navigator.clipboard.writeText(formattedInfo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy debug info:', err);
    }
  };

  // Render hover overlay
  const renderHoverOverlay = () => {
    if (!state.isActive || !state.hoveredElement) return null;
    
    try {
      const rect = state.hoveredElement.getBoundingClientRect();
      const className = typeof state.hoveredElement.className === 'string' ? state.hoveredElement.className : '';
      
      return (
        <div
          className="fixed pointer-events-none z-[9999] border-2 border-blue-500 bg-blue-500/10"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
        >
          <div className="absolute -top-6 left-0 bg-blue-500 text-white px-2 py-1 text-xs rounded whitespace-nowrap">
            {state.hoveredElement.tagName?.toLowerCase() || 'unknown'}
            {state.hoveredElement.id && `#${state.hoveredElement.id}`}
            {className && `.${className.split(' ').join('.')}`}
          </div>
        </div>
      );
    } catch (error) {
      console.warn('🐛 UI Selector hover overlay error:', error);
      return null;
    }
  };

  // Always render in development (temporarily disabled production check for testing)
  // if (process.env.NODE_ENV === 'production') {
  //   return null;
  // }

  return (
    <>
             {/* Fixed Toggle Button - Bottom Right */}
       <div className="fixed bottom-4 right-4 z-[9998]" data-ui-selector-ignore data-debug-ignore>
                  <Button
           variant={state.isActive ? "destructive" : "default"}
           size="lg"
           onClick={(e) => {
             e.stopPropagation();
             console.log('🐛 UI Selector button clicked');
             setState(prev => {
               const newState = { 
                 ...prev, 
                 isActive: !prev.isActive,
                 selectedElement: prev.isActive ? null : prev.selectedElement
               };
               console.log('🐛 UI Selector state changing to:', newState);
               return newState;
             });
           }}
           className={`shadow-2xl border-2 font-bold text-sm ${
             state.isActive 
               ? 'bg-red-500 hover:bg-red-600 text-white border-red-600' 
               : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
           } ${state.isActive ? 'animate-pulse' : 'animate-pulse'}`}
           title="Toggle UI Selector (Ctrl/Cmd + Shift + D)"
         >
           {state.isActive ? (
             <>
               <span className="text-white">❌</span>
               <span className="ml-2">EXIT DEBUG</span>
             </>
           ) : (
             <>
               <span className="text-blue-600">🐛</span>
               <span className="ml-2">DEBUG UI</span>
             </>
           )}
         </Button>
       </div>

      {/* Hover Overlay */}
      {renderHoverOverlay()}

                    {/* Active State Indicator */}
       {state.isActive && (
         <div className="fixed bottom-16 right-4 z-[9998]" data-ui-selector-ignore>
           <Badge variant="secondary" className="shadow-lg animate-pulse bg-blue-100 text-blue-800 border-blue-300">
             <span className="mr-1">👆</span>
             Click any element to debug
           </Badge>
         </div>
       )}

             {/* Debug Panel */}
       {state.selectedElement && (
         <div className="fixed bottom-20 left-4 z-[9998] w-96 max-h-[60vh] overflow-hidden" data-ui-selector-ignore>
          <Card className="shadow-2xl border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold">Debug Info</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyDebugInfo}
                    className={cn(copied && "bg-green-100 border-green-300")}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setState(prev => ({ ...prev, selectedElement: null }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 max-h-[50vh] overflow-y-auto space-y-3">
              {/* Basic Info */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                  <Code className="h-3 w-3" />
                  Component
                </h4>
                <div className="text-xs space-y-1 font-mono bg-gray-50 p-2 rounded">
                  <div><strong>Tag:</strong> {state.selectedElement.tagName}</div>
                  {state.selectedElement.id && <div><strong>ID:</strong> #{state.selectedElement.id}</div>}
                  {state.selectedElement.className && <div><strong>Classes:</strong> .{state.selectedElement.className.split(' ').join(' .')}</div>}
                </div>
              </div>

              <Separator />

              {/* Position */}
              <div>
                <h4 className="font-medium text-sm mb-2">Position & Size</h4>
                <div className="text-xs space-y-1 font-mono bg-gray-50 p-2 rounded">
                  <div><strong>X:</strong> {Math.round(state.selectedElement.position.x)}px</div>
                  <div><strong>Y:</strong> {Math.round(state.selectedElement.position.y)}px</div>
                  <div><strong>Width:</strong> {Math.round(state.selectedElement.position.width)}px</div>
                  <div><strong>Height:</strong> {Math.round(state.selectedElement.position.height)}px</div>
                </div>
              </div>

              <Separator />

              {/* Key Attributes */}
              {Object.keys(state.selectedElement.attributes).length > 0 && (
                <>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Key Attributes</h4>
                    <div className="text-xs space-y-1 font-mono bg-gray-50 p-2 rounded max-h-24 overflow-y-auto">
                      {Object.entries(state.selectedElement.attributes).slice(0, 6).map(([key, value]) => (
                        <div key={key}><strong>{key}:</strong> {value.slice(0, 30)}{value.length > 30 ? '...' : ''}</div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* React Props */}
              {state.selectedElement.reactProps && (
                <>
                  <div>
                    <h4 className="font-medium text-sm mb-2">React Props</h4>
                    <div className="text-xs space-y-1 font-mono bg-blue-50 p-2 rounded max-h-24 overflow-y-auto">
                      {Object.entries(state.selectedElement.reactProps).slice(0, 5).map(([key, value]) => (
                        <div key={key}><strong>{key}:</strong> {String(value).slice(0, 30)}{String(value).length > 30 ? '...' : ''}</div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Parent Chain */}
              <div>
                <h4 className="font-medium text-sm mb-2">Parent Chain</h4>
                <div className="text-xs space-y-1 font-mono bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                  {state.selectedElement.parentChain.slice(0, 4).map((parent, index) => (
                    <div key={index}>{index + 1}. {parent}</div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
} 