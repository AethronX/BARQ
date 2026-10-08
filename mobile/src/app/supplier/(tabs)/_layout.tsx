import { RoleTabs } from '../../../screens/RoleTabs';

export default function SupplierTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', icon: 'home', label: 't_inbox' },
        { name: 'quotes', icon: 'tag', label: 't_quotes' },
        { name: 'orders', icon: 'list', label: 't_orders' },
        { name: 'alerts', icon: 'bell', label: 't_alerts' },
        { name: 'more', icon: 'dots', label: 't_more' },
      ]}
    />
  );
}
