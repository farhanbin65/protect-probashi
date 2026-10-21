import {
  lazy,
  Suspense
} from "react";

import {
  Link,
  Route,
  Routes
} from "react-router-dom";

import { LanguageProvider, useT } from "./hooks/useT";
import { CountryProvider } from "./hooks/useCountry";

import Header from "./components/Header";
import MobileNav from "./components/MobileNav";
import Ticker from "./components/Ticker";
import OfflineBanner from "./components/OfflineBanner";

const WorldClockPage = lazy(() => import("./pages/WorldClockPage"));
const Home = lazy(() => import("./pages/Home"));
const Location = lazy(() => import("./pages/Location"));
const Emergency = lazy(() => import("./pages/Emergency"));
const Embassy = lazy(() => import("./pages/Embassy"));
const Rights = lazy(() => import("./pages/Rights"));
const RightsDetail = lazy(() => import("./pages/RightsDetail"));
const News = lazy(() => import("./pages/News"));
const NewsDetail = lazy(() => import("./pages/NewsDetail"));
const Places = lazy(() => import("./pages/Places"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Layout() {
  const t = useT();

  return (
    <div className="app-layout">
      <a className="skip-link" href="#main">
        {t("skipContent")}
      </a>

      <Header />

      <Ticker />

      <OfflineBanner />

      <main id="main" className="main-content">
        <Suspense
          fallback={
            <div className="page">
              <p>{t("loading")}</p>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/places" element={<Places />} />
            <Route path="/world-clock" element={<WorldClockPage />} />

            <Route
              path="/location"
              element={<Location />}
            />

            <Route
              path="/emergency"
              element={<Emergency />}
            />

            <Route
              path="/embassy"
              element={<Embassy />}
            />

            <Route
              path="/rights"
              element={<Rights />}
            />

            <Route
              path="/rights/:id"
              element={<RightsDetail />}
            />

            <Route
              path="/news"
              element={<News />}
            />

            <Route
              path="/news/:id"
              element={<NewsDetail />}
            />

            <Route
              path="/about"
              element={<About />}
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <MobileNav />

      <footer className="site-footer">
        <Link to="/about">
          {t("about")}
        </Link>

        <Link to="/places">{t("placesNav")}</Link>
        <span>PP</span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <CountryProvider>
        <Layout />
      </CountryProvider>
    </LanguageProvider>
  );
}