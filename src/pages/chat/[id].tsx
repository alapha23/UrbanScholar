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
import { trpc } from "@/utils/trpc";

const ChatProfile: NextPage<ChatProfileProps> = ({ chat }) => {
  const session = useSession();
  const router = useRouter();
  const { task, chatId } = router.query;
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [conversation, setConversation] = useState<
    Array<{ sender: string; table?: string; text: string; imageUrl?: string }>
  >([]);
  const analysisMutation = trpc.useMutation("chat.analysis");
  const qnaMutation = trpc.useMutation("chat.qna");
  const reportMutation = trpc.useMutation("chat.report");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const message = input.trim();
    const newConversation = [...conversation, { sender: "You", text: message }];
    setConversation([...newConversation]);

    setInput("");

    try {
      let response;
      if (task === "Analysis") {
        response = await analysisMutation.mutateAsync({
          data: JSON.stringify({
            message,
            conversationHistory: newConversation,
            chatId: chatId,
          }),
        });
      } else if (task === "QnA") {
        response = await qnaMutation.mutateAsync({
          data: JSON.stringify({
            message,
            conversationHistory: newConversation,
            chatId: chatId,
          }),
        });
      } else if (task === "Report") {
        response = await reportMutation.mutateAsync({
          data: JSON.stringify({
            message,
            conversationHistory: newConversation,
            chatId: chatId,
          }),
        });
      }
      if (response == undefined)
        throw new Error("Network response was not ok.");

      let htmlMessage;
      if ("reply" in response) {
        htmlMessage = await markdownToHtml(response.reply as string);
      } else {
        throw new Error("Failed to get a reply");
      }

      setConversation([
        ...newConversation,
        {
          sender: "UrbanGPT",
          table: response?.table,
          text: htmlMessage,
          //imageUrl: none,
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
            //<div key={index} className={styles.message}>
            <div
              key={index}
              className={`${styles.message} ${
                msg.sender === "You" ? styles.yourMessage : ""
              }`}
            >
              <p className={styles.sender}>{msg.sender}:</p>
              {msg.table && (
                <pre className={styles.commandLineText}>{msg.table}</pre>
              )}
              <div className={styles.messageContent}>
                <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Response"
                    className={styles.image}
                  />
                )}
              </div>
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
    const urlId = params?.id as string;

    const session = (await getServerSession(req, res, authOptions)) as any;

    const [chat] = await Promise.all([
      prisma.chat
        .findFirst({
          where: { id: urlId },
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

          // If no chat is found
          throw new Error("Chat not found");
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
