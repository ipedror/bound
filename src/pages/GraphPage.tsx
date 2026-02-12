// ============================================================
// GraphPage - Full graph visualization page
// ============================================================

import { GraphView } from '../components/GraphView';
import { GraphControls } from '../components/GraphControls';
import { useGraphView } from '../hooks/useGraphView';

export default function GraphPage() {
  const {
    graphViewState,
    changeLayout,
    zoom,
    fit,
    resetView,
  } = useGraphView();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Graph View</h1>
        <p style={styles.subtitle}>Visualize connections between all your contents</p>
      </header>

      <div style={styles.graphContainer}>
        <GraphView />
        <GraphControls
          currentLayout={graphViewState.layout}
          onChangeLayout={changeLayout}
          onZoomIn={() => zoom('in')}
          onZoomOut={() => zoom('out')}
          onResetView={resetView}
          onFit={fit}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    height: 'calc(100vh - 60px)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    marginBottom: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#f1f1f1',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  graphContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    overflow: 'hidden',
    minHeight: '400px',
  },
};
