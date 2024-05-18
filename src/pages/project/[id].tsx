import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "@/styles/project.[id].module.css";

import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import { unstable_getServerSession as getServerSession } from "next-auth";

import { authOptions } from "../api/auth/[...nextauth]";
import Navbar from "@/components/Layout/Navbar";
import { trpc } from "@/utils/trpc";

const stages = [
  "Set Goals",
  "Analyze Data",
  "Generate Plan",
  "Evaluate Plan",
  "Choose Plan",
  "Generate Report",
];

const ProjectDetailPage: NextPage<ProjectDetailPageProps> = ({
  userId,
  projectId,
}) => {
  const router = useRouter();
  const projectUpdateMutation = trpc.useMutation("project.update");
  const projectCurrentStageMutation = trpc.useMutation("project.current-stage");

  const [currentStage, setCurrentStage] = useState(1);
  const [totalStage, setTotalStage] = useState(1);

  useEffect(() => {
    const fetchCurrentStage = async () => {
      const currentStage = await projectCurrentStageMutation.mutateAsync({
        data: JSON.stringify({
          projectId: projectId,
        }),
      });
      if (currentStage == null) {
        throw Error("Project no long exists");
      } else {
        setCurrentStage(currentStage);
        setTotalStage(currentStage);
      }
    };

    fetchCurrentStage();
  }, [projectId]);

  const handleBackClick = async () => {
    // TODO: this will add more meat if project stage has more properties
    await projectUpdateMutation.mutateAsync({
      data: JSON.stringify({
        projectId: projectId,
        stage: totalStage,
      }),
    });
    router.push("/project");
  };

  const handleFinishClick = async () => {
    if (currentStage == 6) {
      // finalize the project
      router.push("/project");
    } else {
      await projectUpdateMutation.mutateAsync({
        data: JSON.stringify({
          projectId: projectId,
          stage: currentStage + 1,
        }),
      });
      if (currentStage == totalStage) {
        setCurrentStage(currentStage + 1);
        setTotalStage(currentStage + 1);
      } else {
        setCurrentStage(currentStage + 1);
      }
    }
  };

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.progressBar}>
          {stages.map((stage, index) => (
            <div
              key={index}
              className={`${styles.stage} ${
                currentStage === index + 1 ? styles.current : ""
              }`}
              onClick={() => {
                if (totalStage >= index + 1) setCurrentStage(index + 1);
              }}
            >
              <button className={styles.dotButton}></button>
              {currentStage === index + 1 && (
                <div className={styles.stageName}>{stage}</div>
              )}
            </div>
          ))}
        </div>
        <div className={styles.content}>{/* Stage content goes here */}</div>
        <div>
          <button
            className={`${styles.finishButton} ${styles.button}`}
            onClick={handleBackClick}
          >
            Save and Return
          </button>
          <button className={styles.finishButton} onClick={handleFinishClick}>
            Next
          </button>
        </div>
      </div>
    </>
  );
};

export default ProjectDetailPage;

type ProjectDetailPageProps = InferGetServerSidePropsType<
  typeof getServerSideProps
>;

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
        projectId: query.id,
      },
    };
  } else {
    return {
      props: {
        userId: session?.user?.id,
        projectId: query.id,
      },
    };
  }
};
