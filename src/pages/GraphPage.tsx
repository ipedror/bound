// ============================================================
// GraphPage - Full-screen Excalidraw-style graph page
// Auto split-view: click node → graph left, content right
// ============================================================

import { useState, useCallback } from 'react';
import { GraphView } from '../components/GraphView';
import { CanvasEditor } from '../components/CanvasEditor';

export default function GraphPage() {
  const [selectedContentId, setSelectedContentId] = useState<string | undefined>();

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedContentId(nodeId);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedContentId(undefined);
  }, []);

  const isSplit = !!selectedContentId;

  return (
    <div style={styles.container}>
      <div style={styles.splitContainer}>
        {/* Left: Graph */}
        <div style={{ ...styles.splitPanel, flex: 1 }}>
          <GraphView
            height="100%"
            width="100%"
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            enableLayers
          />
        </div>

        {/* Right: Content canvas (only when a node is selected) */}
        {isSplit && (
          <>
            <div style={styles.splitDivider} />
            <div style={{ ...styles.splitPanel, flex: 1 }}>
              <CanvasEditor contentId={selectedContentId} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
  },
  splitContainer: {
    display: 'flex',
    width: '100%',
    height: '100%',
  },
  splitPanel: {
    position: 'relative',
    overflow: 'hidden',
  },
  splitDivider: {
    width: '3px',
    backgroundColor: '#1e293b',
    cursor: 'col-resize',
    flexShrink: 0,
  },
};
