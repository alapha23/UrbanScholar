import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import { unstable_getServerSession as getServerSession } from "next-auth";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Layout/Navbar";
import { prisma } from "@/server/db/client";
import { authOptions } from "../api/auth/[...nextauth]";
import styles from "@/styles/chat.module.css";
import React, { useState, useRef } from "react";
import { useRouter } from "next/router";
import { markdownToHtml } from "@/utils/text";

const ChatProfile: NextPage<ChatProfileProps> = ({ chat }) => {
  const session = useSession();
  const router = useRouter();
  const { task } = router.query;
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [conversation, setConversation] = useState<
    Array<{ sender: string; table?: string; text: string; imageUrl?: string }>
  >([]);

  console.log(task);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const message = input.trim();
    const newConversation = [...conversation, { sender: "You", text: message }];
    setInput("");
    try {
      let response;
      if (task === "Analysis") {
        response = await fetch("/api/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationHistory: newConversation,
          }),
        });
      } else if (task === "QnA") {
        response = await fetch("/api/qna", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationHistory: newConversation,
          }),
        });
      }
      if (response == undefined || !response.ok)
        throw new Error("Network response was not ok.");

      const data = await response.json();
      console.log("table", data.table);
      const htmlMessage = await markdownToHtml(data.message);
      console.log(htmlMessage);
      setConversation([
        ...newConversation,
        {
          sender: "UrbanGPT",
          table: data.table,
          text: htmlMessage,
          imageUrl: data.imageUrl,
        },
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
              <pre className="command-line-text">{msg.table}</pre>
              <div dangerouslySetInnerHTML={{ __html: msg.text }} />
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

export default ChatProfile;

type ChatProfileProps = InferGetServerSidePropsType<typeof getServerSideProps>;

export const getServerSideProps = async ({
  params,
  req,
  res,
}: GetServerSidePropsContext) => {
  try {
    const userId = params?.id as string;

    const session = (await getServerSession(req, res, authOptions)) as any;

    const [chat] = await Promise.all([
      prisma.chat
        .findFirst({
          where: { userId: userId },
          select: {
            id: true,
            title: true,
            content: true,
          },
        })
        .then((foundChat: Object | null) => {
          // If a chat is found, return it
          if (foundChat) {
            return foundChat;
          }

          // If no chat is found, create a new one
          return prisma.chat.create({
            data: {
              userId: userId,
              title: "New Chat",
              content: "",
            },
            select: {
              id: true,
              title: true,
              content: true,
            },
          });
        }),
    ]);

    return {
      props: {
        session,
        chat: {
          ...chat,
        },
      },
    };
  } catch (error) {
    return { props: {}, notFound: true };
  }
};
