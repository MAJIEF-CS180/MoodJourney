import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

function App() {

  const [entryText, setEntryText] = useState(""); //holds whatever user types
  const [entries, setEntries] = useState([]); //array of all entries
  const [status, setStatus] = useState(""); //holds message for entry saved or failure to save

  const fetchEntries = async () => {
    try {
      const result = await invoke("read_entries");
      console.log("Fetched entries:", result);
      setEntries(result);
    } catch (err) {
      console.error("Error fetching entries:", err);
    }
  };

  const saveEntry = async () => {
    if (!entryText.trim()) return;

    try {
      await invoke("create_entry", {
        title: "Journal Entry",
        content: entryText,
        password: null, // or you can let the user input this too
      });
      setEntryText("");
      setStatus("Entry saved!");
      fetchEntries(); // refresh the list
    } catch (err) {
      console.error(err);
      setStatus("Failed to save entry.");
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  return (
    <div className="container">
      <h1>Mood Journal</h1>
      <textarea
        value={entryText}
        onChange={(e) => setEntryText(e.target.value)}
        placeholder="Write your thoughts here..."
        style={{
          width: "80%",
          height: "150px",
          fontSize: "1em",
          padding: "1em",
          margin: "1em auto",
          resize: "vertical",
        }}
      />
      <br />
      <button onClick={saveEntry}>Save Entry</button>
      <p>{status}</p>

      <h2>Previous Entries</h2>
      <div style={{ textAlign: "left", maxWidth: "80%", margin: "auto" }}>
        {entries.length === 0 && <p>No entries found.</p>}
        {entries.map((entry, i) => (
          <div key={i} style={{ marginBottom: "1em", borderBottom: "1px solid #ccc", paddingBottom: "0.5em" }}>
            <strong>{entry.date}</strong>
            <p>{entry.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
