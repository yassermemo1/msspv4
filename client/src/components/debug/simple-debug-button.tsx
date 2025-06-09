// Simple Debug Button - Fallback for UI Selector
// Always visible, plain styling, guaranteed to work

import React, { useState, useEffect, useCallback } from 'react';

export function SimpleDebugButton() {
  const [isActive, setIsActive] = useState(false);

  const toggleDebug = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsActive(!isActive);
  };

  const handleElementClick = useCallback((e: MouseEvent) => {
    const element = e.target as Element;
    
    // Only ignore our debug buttons and panels, allow other buttons to be selected
    if (!element || 
        element.closest('[data-debug-ignore]') || 
        element.closest('[data-ui-selector-ignore]') ||
        element.closest('[data-simple-debug-panel]')) {
      return; // Let the debug button click work normally
    }
    
    // Don't prevent default for elements inside dialogs/modals to avoid closing them
    const isInDialog = element.closest('[role="dialog"]') || 
                      element.closest('.modal') || 
                      element.closest('[data-radix-dialog-overlay]') ||
                      element.closest('[data-radix-dialog-content]');
    
    if (!isInDialog) {
      e.preventDefault();
    }
    e.stopPropagation();
    
    const debugInfo = {
      tagName: element.tagName?.toLowerCase() || 'unknown',
      id: element.id || 'none',
      className: element.className || 'none',
      textContent: element.textContent?.slice(0, 50) || 'empty',
      position: element.getBoundingClientRect()
    };
    
    console.log('🐛 CLICKED ELEMENT:', debugInfo);
    
    // Show nice debug panel next to clicked element
    const existingPanel = document.querySelector('[data-simple-debug-panel]');
    if (existingPanel) existingPanel.remove();
    
    // Calculate position next to clicked element
    const rect = debugInfo.position;
    const panelWidth = 350;
    const panelHeight = 200;
    
    let panelX = rect.right + 10; // Position to the right of element
    let panelY = rect.top;
    
    // Adjust if panel would go off screen
    if (panelX + panelWidth > window.innerWidth) {
      panelX = rect.left - panelWidth - 10; // Position to the left instead
    }
    if (panelY + panelHeight > window.innerHeight) {
      panelY = window.innerHeight - panelHeight - 10; // Move up if too low
    }
    if (panelX < 10) panelX = 10; // Don't go off left edge
    if (panelY < 10) panelY = 10; // Don't go off top edge
    
    const panel = document.createElement('div');
    panel.setAttribute('data-simple-debug-panel', 'true');
    panel.style.cssText = `
      position: fixed;
      left: ${panelX}px;
      top: ${panelY}px;
      background: white;
      border: 2px solid #0066cc;
      border-radius: 8px;
      padding: 16px;
      font-family: monospace;
      font-size: 12px;
      width: ${panelWidth}px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      z-index: 10001;
      color: #333;
    `;
    
    // Create copy-friendly debug info
    const copyText = `🐛 DEBUG INFO
Tag: ${debugInfo.tagName}
ID: ${debugInfo.id}
Class: ${debugInfo.className}
Text: ${debugInfo.textContent}
Position: ${Math.round(debugInfo.position.x)}, ${Math.round(debugInfo.position.y)}
Size: ${Math.round(debugInfo.position.width)} x ${Math.round(debugInfo.position.height)}`;
    
    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <strong style="color: #0066cc;">🐛 Debug Info</strong>
        <div>
          <button onclick="navigator.clipboard.writeText(\`${copyText.replace(/`/g, '\\`')}\`).then(() => {
            const btn = this;
            const oldText = btn.innerHTML;
            btn.innerHTML = '✓ Copied!';
            btn.style.background = '#00aa00';
            setTimeout(() => {
              btn.innerHTML = oldText;
              btn.style.background = '#0066cc';
            }, 1500);
          })" style="background: #0066cc; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; margin-right: 4px;">📋 Copy</button>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #ff4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">✕</button>
        </div>
      </div>
      <div><strong>Tag:</strong> ${debugInfo.tagName}</div>
      <div><strong>ID:</strong> ${debugInfo.id}</div>
      <div><strong>Class:</strong> ${debugInfo.className}</div>
      <div><strong>Text:</strong> ${debugInfo.textContent}</div>
      <div style="margin-top: 8px;"><strong>Position:</strong> ${Math.round(debugInfo.position.x)}, ${Math.round(debugInfo.position.y)}</div>
      <div><strong>Size:</strong> ${Math.round(debugInfo.position.width)} x ${Math.round(debugInfo.position.height)}</div>
      <div style="margin-top: 8px; font-size: 10px; color: #666;">✅ Click Copy button to share with assistant</div>
    `;
    
    document.body.appendChild(panel);
    
    // Auto-remove after 15 seconds (increased time)
    setTimeout(() => {
      if (panel.parentElement) panel.remove();
    }, 15000);
  }, []);

  // Effect to manage event listeners and cleanup
  useEffect(() => {
    if (isActive) {
      document.body.style.cursor = 'crosshair';
      document.addEventListener('click', handleElementClick, true);
      console.log('🐛 Simple Debug Mode ACTIVATED');
    } else {
      document.body.style.cursor = '';
      document.removeEventListener('click', handleElementClick, true);
      // Also remove any existing debug panels
      const existingPanel = document.querySelector('[data-simple-debug-panel]');
      if (existingPanel) existingPanel.remove();
      console.log('🐛 Simple Debug Mode DEACTIVATED');
    }

    // Cleanup function
    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('click', handleElementClick, true);
      const existingPanel = document.querySelector('[data-simple-debug-panel]');
      if (existingPanel) existingPanel.remove();
    };
  }, [isActive, handleElementClick]);

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 10000,
        fontFamily: 'monospace'
      }}
      data-debug-ignore
      data-ui-selector-ignore
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={toggleDebug}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: 'bold',
          border: '3px solid #333',
          borderRadius: '8px',
          cursor: 'pointer',
          backgroundColor: isActive ? '#ff4444' : '#ffffff',
          color: isActive ? '#ffffff' : '#333333',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          animation: 'pulse 2s infinite'
        }}
        title="Click to toggle debug mode"
      >
        {isActive ? '❌ EXIT DEBUG' : '🐛 DEBUG UI'}
      </button>
      
      {isActive && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '0',
            backgroundColor: '#0066cc',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            animation: 'pulse 1s infinite'
          }}
        >
          👆 Click any element
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
} 