import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import { DashboardView } from './components/DashboardView';
import { StudentMasterView } from './components/StudentMasterView';
import { ImportCenterView } from './components/ImportCenterView';
import { VerificationQueueView } from './components/VerificationQueueView';
import { ProctorHandoffView } from './components/ProctorHandoffView';
import { ReportsAndExportsView } from './components/ReportsAndExportsView';
import { StudentPortalView } from './components/StudentPortalView';
import { AuditTrailView } from './components/AuditTrailView';
import { SettingsConfigView } from './components/SettingsConfigView';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  return (
    <AuthProvider>
      <AppLayout currentTab={currentTab} setCurrentTab={setCurrentTab}>
        {currentTab === 'dashboard' && <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />}
        {currentTab === 'students' && <StudentMasterView />}
        {currentTab === 'import' && <ImportCenterView onImportSuccess={() => setCurrentTab('dashboard')} />}
        {currentTab === 'verification' && <VerificationQueueView />}
        {currentTab === 'proctor' && <ProctorHandoffView />}
        {currentTab === 'reports' && <ReportsAndExportsView />}
        {currentTab === 'my_profile' && <StudentPortalView />}
        {currentTab === 'audit' && <AuditTrailView />}
        {currentTab === 'settings' && <SettingsConfigView />}
      </AppLayout>
    </AuthProvider>
  );
}

export default App;
