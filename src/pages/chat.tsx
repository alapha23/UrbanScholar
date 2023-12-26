import React, { useState, useRef } from "react";
import { useRouter } from "next/router";
import styles from "../styles/chat.module.css";

import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import { unstable_getServerSession as getServerSession } from "next-auth";

import { authOptions } from "./api/auth/[...nextauth]";
import Navbar from "@/components/Layout/Navbar";
import { trpc } from "@/utils/trpc";

type ConversationType = {
  sender: string;
  text: string;
  imageUrl?: string;
};

const ChatPage: NextPage<ChatPageProps> = ({ userId }) => {
  const router = useRouter();
  const chatCreateMutation = trpc.useMutation("chat.create");

  const createChat = async (task: string) => {
    chatCreateMutation
      .mutateAsync({
        userId: userId,
      })
      .then((chatId) => {
        router
          .push({ pathname: `/chat/${chatId}`, query: { task: task } })
          .then(() => {
            console.log(chatId);
          });
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleButtonClick = async (task: string) => {
    console.log(task);
    try {
      if (task === "Analysis" || task === "QnA" || task === "Report") {
        await createChat(task);
      } else {
        throw new Error("Unrecognized Task");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div>
          <button
            className={styles.button}
            onClick={() => handleButtonClick("Analysis")}
          >
            Analysis
          </button>
          <button
            className={styles.button}
            onClick={() => handleButtonClick("QnA")}
          >
            Domain-knowledge Q&A
          </button>
          <button
            className={styles.button}
            onClick={() => handleButtonClick("Report")}
          >
            Generate Report
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
