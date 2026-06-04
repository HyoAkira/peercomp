import { Link } from "react-router";

export default function FooterComponent() {
  return (
    <footer className="footer bg-neutral text-neutral-content p-10">
      <aside>
        <Link to="/" className="text-xl font-bold">
          PeerComp
        </Link>
        <p>
          PeerComp.
          <br />
          Sıradan bir BŞEÜ bitirme projesidir.
        </p>
      </aside>
    </footer>
  );
}
