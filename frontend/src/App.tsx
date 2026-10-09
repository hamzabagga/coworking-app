import { Route, BrowserRouter as Router, Routes } from "react-router";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import SignIn from "./pages/AuthPages/SignIn";
import Home from "./pages/Dashboard/Home";
import Members from "./pages/Members";
import NotFound from "./pages/OtherPage/NotFound";
import Profile from "./pages/Profile";
import Reservations from "./pages/Reservations";
import Spaces from "./pages/Spaces";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Pages accessibles uniquement connecté */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />
              <Route path="/spaces" element={<Spaces />} />
              <Route path="/reservations" element={<Reservations />} />
              <Route path="/profile" element={<Profile />} />

              {/* Admin uniquement */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/members" element={<Members />} />
              </Route>
            </Route>
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
