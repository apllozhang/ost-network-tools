import { Route, Switch } from "wouter";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AuthGuard from "./components/auth/AuthGuard";
import AppShell from "./components/layout/AppShell";
import Login from "./pages/Login";
import EnterpriseDashboard from "./pages/EnterpriseDashboard";
import DeviceManager from "./pages/DeviceManager";
import PoeDiagnostics from "./pages/PoeDiagnostics";
import TdrView from "./pages/TdrView";
import VlanManager from "./pages/VlanManager";
import SnmpManager from "./pages/SnmpManager";
import TrafficAnalyzer from "./pages/TrafficAnalyzer";
import LogAnalyzer from "./pages/LogAnalyzer";
import FirmwareManager from "./pages/FirmwareManager";
import DeviceSearch from "./pages/DeviceSearch";
import DeviceList from "./pages/DeviceList";
import DeviceDetail from "./pages/DeviceDetail";
import NetworkTools from "./pages/NetworkTools";
import AlertCenter from "./pages/AlertCenter";
import AlertDetail from "./pages/AlertDetail";
import AuditLog from "./pages/AuditLog";

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Switch>
          <Route path="/login" component={Login} />
          <Route>
            <AuthGuard>
              <AppShell>
                <Switch>
                  <Route path="/" component={EnterpriseDashboard} />
                  <Route path="/devices" component={DeviceList} />
                  <Route path="/devices/:id">{(params: { id: string }) => <DeviceDetail id={params.id} />}</Route>
                  <Route path="/alerts" component={AlertCenter} />
                  <Route path="/alerts/:id">{(params: { id: string }) => <AlertDetail id={params.id} />}</Route>
                  <Route path="/tools" component={NetworkTools} />
                  <Route path="/audit" component={AuditLog} />
                  <Route path="/connect" component={DeviceManager} />
                  <Route path="/poe" component={PoeDiagnostics} />
                  <Route path="/tdr" component={TdrView} />
                  <Route path="/vlan" component={VlanManager} />
                  <Route path="/snmp" component={SnmpManager} />
                  <Route path="/traffic" component={TrafficAnalyzer} />
                  <Route path="/log" component={LogAnalyzer} />
                  <Route path="/firmware" component={FirmwareManager} />
                  <Route path="/search" component={DeviceSearch} />
                  <Route>404 Not Found</Route>
                </Switch>
              </AppShell>
            </AuthGuard>
          </Route>
        </Switch>
      </div>
    </ThemeProvider>
  );
}
