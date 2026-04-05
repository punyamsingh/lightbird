// Mock all lucide-react icons as simple span elements
const handler: ProxyHandler<Record<string, unknown>> = {
  get(_target, prop: string) {
    if (prop === '__esModule') return true;
    // Return a simple component that renders a span with the icon name
    const Component = (props: Record<string, unknown>) => {
      const React = require('react');
      return React.createElement('span', { 'data-icon': prop, ...props });
    };
    Component.displayName = prop;
    return Component;
  },
};

module.exports = new Proxy({}, handler);
