import { Component } from 'react';

// Wraps embedded components owned by other feature folders (Tests, AI
// Summary). Keeps a crash in one of those panels from taking down the
// whole dashboard instead of just that section.
export default class ExternalPanelBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'var(--text-muted)' }}>
          This section is temporarily unavailable. Please try reloading the page.
        </div>
      );
    }
    return this.props.children;
  }
}
