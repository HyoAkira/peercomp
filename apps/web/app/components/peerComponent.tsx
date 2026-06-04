import { api } from "@peercomp/config";
import { useEffect, useRef, use } from "react";
import { KademliaNode } from "~/lib/peer/peer-node";
import { usePeerNode, useToken } from "~/lib/store";

export default function PeerComponent() {
  const node = usePeerNode((state) => state.peerNode);
  const setPeerNode = usePeerNode((state) => state.setPeerNode);
  const initialized = useRef(false);
  const token = useToken((state) => state.token);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let knode: KademliaNode;
    let userId;
    (async () => {
      let peers = await getPeers();
      if (token)
        userId = await fetch(`${api.baseURL}${api.apiURL}users/verify`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((res) => res.json())
          .then((data) => data.userId);
      knode = new KademliaNode(userId || undefined);
      await knode.start();
      peers = peers.filter((p) => p !== knode.id);
      peers.forEach((peerId) => knode?.bootstrap(peerId));
      setPeerNode(knode);
    })();

    return () => {
      knode?.destroy();
      setPeerNode(null);
    };
  }, []);

  return <></>;
}

async function getPeers(): Promise<string[]> {
  const url = `${api.baseURL}${api.peers}`;
  const options = {
    method: "GET",
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return data.connections;
  } catch (error) {
    console.error("Error fetching peers:", error);
    return [];
  }
}
