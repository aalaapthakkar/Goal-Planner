import NavBar from './NavBar.jsx';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-bg font-body text-text">
      <NavBar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
