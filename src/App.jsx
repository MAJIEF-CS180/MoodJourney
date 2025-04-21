import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

function App() {
  useEffect(() => {
    const test = async () => {
      const entries = await invoke("read_entries");
      console.log("Fetched entries:", entries);
    };

    test();
  }, []);

  return <div>Check the console for results.</div>;
}

export default App;
