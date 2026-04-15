import { useState } from "react";
import axios from "axios";

export default function AIChat() {

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  // prediction states
  const [prediction, setPrediction] = useState([]);
  const [insight, setInsight] = useState("");

  const sendMessage = async () => {

    if (!message) return;

    const newChat = [
      ...chat,
      { role: "user", response: message }
    ];

    setChat(newChat);
    setMessage("");
    setLoading(true);

    try {

      const res = await axios.post(
        "http://localhost:5000/ai-sql",
        { message }
      );

      setChat([
        ...newChat,
        { role: "ai", response: res.data.data, sql: res.data.sql }
      ]);

    } catch (e) {
      console.log(e);
    }

    setLoading(false);
  };


  const predictProducts = async () => {

    setLoading(true);

    try {

      const res = await axios.get(
        "http://localhost:5000/predict-products"
      );
      setPrediction(res.data.topProducts);
      setInsight(res.data.insight);

    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>

      <h2>AI Assistant</h2>

      <div style={{ minHeight: 300, marginBottom: 20 }}>

        {chat.map((c, i) => (
          <div key={i} style={{ marginBottom: 15 }}>
            <b>{c.role === "user" ? "You" : "AI"}:</b>
            {c.role === "user" && <p>{c.response}</p>}

            {c.role === "ai" && (
              <div>
                {c.sql && (
                  <div style={{ background: "#f5f5f5", padding: 10, marginBottom: 10, borderRadius: 4 }}>
                    <strong>Generated SQL:</strong>
                    <pre>{c.sql}</pre>
                  </div>
                )}

                {Array.isArray(c.response) && c.response.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
                    <thead>
                      <tr style={{ background: "#f0f0f0" }}>
                        {Object.keys(c.response[0]).map((header) => (
                          <th key={header} style={{ border: "1px solid #ddd", padding: 8, textAlign: "left" }}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {c.response.map((row, rowIdx) => (
                        <tr key={rowIdx} style={{ background: rowIdx % 2 === 0 ? "#fafafa" : "white" }}>
                          {Object.values(row).map((value, colIdx) => (
                            <td key={colIdx} style={{ border: "1px solid #ddd", padding: 8 }}>
                              {value !== null && value !== undefined ? String(value) : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>{c.response}</p>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && <p>AI typing...</p>}

      </div>

      <input
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Ask something..."
        style={{ padding: 8, marginRight: 10, width: 300 }}
      />

      <button onClick={sendMessage} style={{ padding: "8px 16px" }}>
        Send
      </button>

      <button onClick={predictProducts} style={{ marginLeft: 10 }}>
        Predict Products 2026
      </button>

      <div>
        {/* {insight && (
          <div style={{
            background: "#eef5ff",
            padding: 20,
            marginTop: 20
          }}>
            <h3>Prediction Insight</h3>
            <p>{insight}</p>
          </div>
        )} */}

        {/* Predicted Products */}
        {prediction.length > 0 && (
          <div style={{ marginTop: 20 }}>

            <h3>Top Predicted Products</h3>

            {prediction.map((p, index) => (
              <div key={index}
                style={{
                  border: "1px solid #ddd",
                  padding: 10,
                  marginBottom: 10
                }}
              >
                <strong>{p.product}</strong>

                <p>
                  Demand: {Math.round(p.prediction)}
                </p>

                <p>
                  Trend: {p.slope > 0 ? "📈 Increasing" : "📉 Decreasing"}
                </p>
              </div>
            ))}

          </div>
        )}
      </div>
    </div>
  );
}