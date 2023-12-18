import React, { useState, useRef } from "react";
import { useRouter } from "next/router";

import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import { unstable_getServerSession as getServerSession } from "next-auth";

import styles from "../styles/chat.module.css";
import { authOptions } from "./api/auth/[...nextauth]";
import Navbar from "@/components/Layout/Navbar";
import { trpc } from "@/utils/trpc";

type ConversationType = {
  sender: string;
  text: string;
  imageUrl?: string;
};

const ChatPage: NextPage<ChatPageProps> = ({ userId }) => {
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [conversation, setConversation] = useState<
    Array<{ sender: string; text: string; imageUrl?: string }>
  >([]);
  const router = useRouter();
  const chatCreateMutation = trpc.useMutation("chat.create");

  const sendMessage = async () => {
    if (!input.trim()) return;
    const message = input.trim();
    const newConversation = [...conversation, { sender: "You", text: message }];
    setInput("");

    chatCreateMutation
      .mutateAsync({
        userId: userId,
      })
      .then((chatId) => {
        console.log(chatId);
        router.push(`/chat/${chatId}`).then(() => {
          handleSendMessage(message, newConversation);
        });
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleSendMessage = async (
    message: string,
    newConversation: ConversationType[]
  ) => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationHistory: newConversation }),
      });

      if (!response.ok) throw new Error("Network response was not ok.");

      const data = await response.json();
      setConversation([
        ...newConversation,
        { sender: "UrbanGPT", text: data.message, imageUrl: data.imageUrl },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setConversation([
        ...newConversation,
        { sender: "Error", text: "Failed to get response." },
      ]);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const formData = new FormData();
      formData.append("file", file, file.name);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("File upload failed");
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <Navbar />
      <div className={styles.conversationContainer}>
        <div className={styles.chatBox}>
          {conversation.map((msg, index) => (
            <div key={index} className={styles.message}>
              <p className={styles.sender}>{msg.sender}:</p>
              <p>{msg.text}</p>
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="Response"
                  className={styles.image}
                />
              )}
            </div>
          ))}
        </div>
        <div className={styles.inputArea}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: "none" }} // hide the actual file input
          />
          <button
            onClick={handleFileUploadClick}
            className={styles.fileUploadButton}
          >
            📁
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className={styles.input}
          />
          <button onClick={sendMessage} className={styles.sendButton}>
            Send
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatPage;

type ChatPageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

export const getServerSideProps = async ({
  req,
  res,
  query,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return {
      redirect: {
        destination: "/sign-in",
        permanent: true,
      },
      props: {
        userId: null,
      },
    };
  } else {
    return {
      props: {
        userId: session?.user?.id,
      },
    };
  }
};
