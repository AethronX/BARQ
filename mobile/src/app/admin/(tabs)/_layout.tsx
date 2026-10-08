import { RoleTabs } from '../../../screens/RoleTabs';

export default function AdminTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', icon: 'home', label: 't_overview' },
        { name: 'stats', icon: 'activity', label: 't_stats' },
        { name: 'companies', icon: 'building', label: 't_companies' },
        { name: 'audit', icon: 'doc', label: 't_audit' },
        { name: 'alerts', icon: 'bell', label: 't_alerts' },
        { name: 'more', icon: 'dots', label: 't_more' },
      ]}
    />
  );
}
