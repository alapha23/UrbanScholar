import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "@/styles/project.module.css";

import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import { unstable_getServerSession as getServerSession } from "next-auth";

import { authOptions } from "./api/auth/[...nextauth]";
import Navbar from "@/components/Layout/Navbar";
import { trpc } from "@/utils/trpc";
import { Project } from "@/utils/types";

const ProjectPage: NextPage<ProjectPageProps> = ({ userId }) => {
  const router = useRouter();
  const projectCreateMutation = trpc.useMutation("project.create");
  const projectFetchAllMutation = trpc.useMutation("project.fetch-all");

  const [projects, setProjects] = useState<Project[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      const projects = await projectFetchAllMutation.mutateAsync({
        data: JSON.stringify({ userId: userId }),
      });
      setProjects(projects);
    };

    fetchProjects();
  }, [userId]);

  const handleBack = () => {
    setShowPopup(false);
  };

  const createProject = async () => {
    console.log(
      "to create project ",
      userId,
      newProjectTitle,
      newProjectDescription
    );
    const project = await projectCreateMutation.mutateAsync({
      data: JSON.stringify({
        userId: userId,
        title: newProjectTitle,
        description: newProjectDescription,
      }),
    });
    console.log("create project ", project);
    const stages = JSON.parse(project.allStageIds);
    console.log("project comes with stages: ", stages);
    router.push(`/stage/${stages[0]}`);
  };

  const handleProjectClick = (project: Project) => {
    const allStageIds = JSON.parse(project.allStageIds);
    router.push(`/stage/${allStageIds[0]}`);
  };

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.header}>
          <button
            className={styles.createButton}
            onClick={() => setShowPopup(true)}
          >
            Create
          </button>
        </div>
        <div className={styles.projectsContainer}>
          {projects.map((project) => (
            <div
              key={project.projectId}
              className={styles.projectCard}
              onClick={() => handleProjectClick(project)}
            >
              <h3>{project.title}</h3>
              <p className={styles.description}>{project.description}</p>
            </div>
          ))}
        </div>
        {showPopup && (
          <div className={styles.popup}>
            <div className={styles.popupContent}>
              <h2>Create New Project</h2>
              <input
                type="text"
                placeholder="Title"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                className={styles.input}
              />
              <textarea
                placeholder="Description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                className={styles.textarea}
              />
              <div className={styles.buttonContainer}>
                <button
                  className={`${styles.createButton} ${styles.button}`}
                  onClick={createProject}
                >
                  Create
                </button>
                <button
                  className={`${styles.createButton} ${styles.button}`}
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProjectPage;

type ProjectPageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

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
