import type { NextPage } from "next";
import { useEffect, useState, useRef } from "react";

import Navbar from "@/components/Layout/Navbar";

interface Hospital {
  id: string;
  name: string;
}

const Index: NextPage = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const messageEndRef = useRef<null | HTMLDivElement>(null);
  const [chats, setChats] = useState<string[]>(["chat1 talk about skin issues", "chat 2 about plastic survey", "c"]);
  const hospitals: Hospital[] = [
    { id: 'hosp1', name: 'Hospital 1' },
    { id: 'hosp2', name: 'Hospital 2' },
    { id: 'hosp3', name: 'Hospital 3' },
    { id: 'hosp4', name: 'Hospital 4' },
    { id: 'hosp5', name: 'Hospital 5' },
    // Add more hospitals as needed
  ];
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
  const [survey, setSurvey] = useState<string>("Choose Any Chat to View Survey Results")

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = () => {
    if (inputMessage.trim() !== "") {
      setMessages([...messages, inputMessage]);
      setInputMessage("");
    }
  };

  const handleSendHospital = () => {
    if (inputMessage.trim() !== "") {
      setMessages([...messages, inputMessage]);
      setInputMessage("");
    }
  };

  const toggleHospital = (id: string) => {
    const currentIndex = selectedHospitals.indexOf(id);
    const newSelectedHospitals = [...selectedHospitals];

    if (currentIndex === -1) {
      if (newSelectedHospitals.length < 2) {
        newSelectedHospitals.push(id);
      }
    } else {
      newSelectedHospitals.splice(currentIndex, 1);
    }

    setSelectedHospitals(newSelectedHospitals);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (file) {
      // Here, you would typically use a FileReader to handle the file
      // and maybe send its content to an API.
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result;
        console.log(text); // For demonstration, just log it to the console

        // Here you could invoke your API stub
        // exampleAPI(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex">
        {/* Leftmost column - list of chats */}
        <div className="w-1/5 border-r-2 p-4 overflow-y-auto">
          {/* Add your list of chats here */}
          {chats.map((chat, idx) => (
            <div key={idx} className="p-2 border-b">{chat}</div>
          ))}
        </div>

        {/* Central column - chat */}
        <div className="w-1/2 flex flex-col items-stretch border-r-2">
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className="break-words p-2">{msg}</div>
            ))}
            <div ref={messageEndRef} />
          </div>
          <div className="flex w-full p-2">
            <label htmlFor="file-upload" className="cursor-pointer p-2">
              <img src="/file-icon.png" alt="Upload file" className="h-6 w-6" />
            </label>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 border-2 m-2 p-2"
              placeholder="Type a message..."
            />
            <button onClick={handleSend} className="p-2">
              <img src="/send-icon.png" alt="Send" className="h-6 w-10" />
            </button>
          </div>
        </div>

        {/* Rightmost column - divided into two vertical blocks */}
        <div className="w-3/10 flex flex-col" style={{ width: '350px' }}>
          {/* Upper vertical block - readonly y-axis scrollable textbox */}
          <div className="flex-1 border-b-2 overflow-y-auto p-4" style={{ width: '350px' }}>
            <div className="w-full h-full border p-2" style={{ whiteSpace: 'pre-wrap' }}>
              {survey}
            </div>
          </div>

          {/* Lower vertical block - x-axis scrollable row of cards with horizontal slider bar */}
          <div>
            <div className="p-4" style={{ width: '400px' }}>
              <div className="overflow-x-auto">
                <div className="flex space-x-4" style={{ minWidth: `${hospitals.length * (160 + 16)}px` }}>
                  {hospitals.map((hospital) => (
                    <div key={hospital.id}
                      className={`w-40 h-80 border p-2 overflow-y-auto ${selectedHospitals.includes(hospital.id) ? 'bg-blue-200' : ''}`}
                      onClick={() => toggleHospital(hospital.id)}
                      style={{ cursor: 'pointer' }}>
                      <textarea className="w-full h-full border-none p-2" readOnly value="Card content">{hospital.name}</textarea>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              className={`mt-4 p-2 ${selectedHospitals.length === 2 ? 'bg-blue-500 hover:bg-blue-700 text-white' : 'bg-gray-500 text-gray-200'}`}
              disabled={selectedHospitals.length !== 2}
              onClick={handleSendHospital}
            >
              Send Hospital Recommendation (Exactly 2)
            </button>
          </div>


        </div>
      </div>
    </>
  );
};

export default Index;
