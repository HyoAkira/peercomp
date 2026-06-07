import { api } from "@peercomp/config";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useToken } from "~/lib/store";

export default function PanelGuard() {
  const token = useToken((state) => state.token);
  const navigate = useNavigate();
  useEffect(() => {
    if (!token) navigate("/login");
    const verify = async () => {
      const url = `${api.baseURL}${api.apiURL}users/verify`;
      const options = {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      };
      try {
        const response = await fetch(url, options);
        const data = await response.json();
        if(data.error) throw new Error(data.error);
        (async () => {
          const url = `${api.baseURL}${api.apiURL}users/me`;
          const options = {
            method: "GET",
            headers: {
              authorization: `Bearer ${token}`,
            },
          };

          try {
            const response = await fetch(url, options);
            const data = await response.json();
            if(data.error) throw new Error(data.error);
          } catch (error) {
            navigate("/login");
          }
        })();
        // verify exp date
        if (data.exp < Date.now() / 1000) {
          navigate("/login");
        }
      } catch (error) {
        navigate("/login");
      }
    };
    verify();
  }, [token, navigate]);
  return null;
}
