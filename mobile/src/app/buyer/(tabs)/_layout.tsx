import { RoleTabs } from '../../../screens/RoleTabs';

export default function BuyerTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', icon: 'home', label: 't_home' },
        { name: 'rfqs', icon: 'doc', label: 't_rfqs' },
        { name: 'orders', icon: 'list', label: 't_orders' },
        { name: 'alerts', icon: 'bell', label: 't_alerts' },
        { name: 'more', icon: 'dots', label: 't_more' },
      ]}
    />
  );
}
