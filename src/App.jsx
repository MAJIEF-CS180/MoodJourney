import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

function App() {

  const [entryText, setEntryText] = useState(""); //holds whatever user types
  const [entries, setEntries] = useState([]); //array of all entries
  const [status, setStatus] = useState(""); //holds message for entry saved or failure to save
  const [reportMode, setReportMode] = useState("week"); // week/month toggle
  const [lastEmotion, setLastEmotion] = useState(""); // for instant feedback from backend testing

  const fetchEntries = async () => {
    try {
      const result = await invoke("read_entries");
      console.log("Fetched entries:", result);
      setEntries(result);
    } catch (err) {
      console.error("Error fetching entries:", err);
    }
  };

  const checkEntries = () => {


    const date = new Date();
    const currDate = dayjs(date).format("YYYY-MM-DD");

    return entries.some((entry) => entry.date === currDate);
  }

  const updateEntry = async () => {
    const currDate = dayjs().format("YYYY-MM-DD");
    try {
      const currEntry = await invoke("get_entry", { date: currDate });
      const emotion = await invoke("classify_emotion", { text: entryText });
      console.log("Detected emotion:", emotion);

      const updatedContent = `${entryText}\n\n Emotion: ${emotion}`;
      await invoke("update_entry", {
        date: currEntry.date,
        newTitle: currEntry.title,
        newContent: updatedContent,
        newPassword: currEntry.password,
      });

      setEntryText("");
      setStatus("Entry updated with emotion!");
      setLastEmotion(emotion);
      fetchEntries();
    } catch (err) {
      console.error(err);
      setStatus("Failed to update entry.");
    }
  };

  const saveEntry = async () => {
    if (!entryText.trim()) return;

    try {
      const emotion = await invoke("classify_emotion", { text: entryText });
      console.log("Detected emotion:", emotion);

      const contentWithEmotion = `${entryText}\n\n Emotion: ${emotion}`; //change later
      setLastEmotion(emotion);
      
      if (checkEntries()) {
        updateEntry();
      }
      else {
        await invoke("create_entry", {
          title: "Journal Entry",
          content: contentWithEmotion,
          password: null, 
        });
        setEntryText("");
        setStatus("Entry saved with emotions!"); 
        fetchEntries(); // refresh the list
      }
      
    } catch (err) {
      console.error(err);
      setStatus("Failed to save entry.");
    }
  };

  // Group emotions by week or month
  const aggregateEmotions = (entries, mode = "week") => {
    const grouped = {};

    entries.forEach((entry) => {
      const emotionMatch = entry.content.match(/🧠 Emotion:\s*(\w+)/);
      const emotion = emotionMatch ? emotionMatch[1] : null;

      if (!emotion) return;

      const key =
        mode === "week"
          ? dayjs(entry.date).startOf("week").format("YYYY-MM-DD")
          : dayjs(entry.date).startOf("month").format("YYYY-MM");

      if (!grouped[key]) grouped[key] = {};
      grouped[key][emotion] = (grouped[key][emotion] || 0) + 1;
    });

    return Object.entries(grouped).map(([period, emotions]) => ({
      period,
      ...emotions,
    }));
  };


  const handleDelete = async (entry) => {
    try {
      await invoke("delete_entry", { date: entry.date });
      fetchEntries();
    } catch(err) {
      console.error(err);
    }
  };


  useEffect(() => {
    fetchEntries();
  }, []);


return (
  <div className="container" style={{ padding: "2em", fontFamily: "sans-serif" }}>
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

    {/* Show last detected emotion for user feedback */}
    {lastEmotion && (
      <p>
        <strong>Detected Emotion:</strong> {lastEmotion}
      </p>
    )}

    <h2>Previous Entries</h2>
    <div style={{ textAlign: "left", maxWidth: "80%", margin: "auto" }}>
      {entries.length === 0 && <p>No entries found.</p>}
      {entries.map((entry, i) => (
        <div
          key={i}
          style={{
            marginBottom: "1em",
            borderBottom: "1px solid #ccc",
            paddingBottom: "0.5em",
          }}
        >
          <strong>{entry.date}</strong>
          <p>{entry.content}</p>
          <button onClick={() => handleDelete(entry)}> X </button>
        </div>
      ))}
    </div>

    <h2>Mood Report</h2>

    {/* Buttons to switch between weekly and monthly */}
    <div style={{ marginBottom: "1em" }}>
      <button onClick={() => setReportMode("week")} disabled={reportMode === "week"}>
        Weekly
      </button>
      <button onClick={() => setReportMode("month")} disabled={reportMode === "month"}>
        Monthly
      </button>
    </div>

    {/* Bar chart to visualize emotion trends */}
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={aggregateEmotions(entries, reportMode)}>
          <XAxis dataKey="period" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="happy" fill="#82ca9d" />
          <Bar dataKey="sad" fill="#8884d8" />
          <Bar dataKey="angry" fill="#ff7f7f" />
          <Bar dataKey="neutral" fill="#a0a0a0" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);
}

export default App;
