import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/router";
import { trpc } from "@/utils/trpc";
import styles from "@/styles/roleselection.module.css";
import Navbar from "@/components/Layout/Navbar";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";

const RoleSelection: NextPage<RoleSelectionPageProps> = ({ userId }) => {
  const [role, setRole] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [profile, setProfile] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    age: "",
    gender: "",
    affiliation: "",
    profession: "",
    nationality: "",
  });
  const router = useRouter();

  const verifyMutation = trpc.useMutation("register.verify");
  const saveRoleMutation = trpc.useMutation("register.save_role");
  const saveProfileMutation = trpc.useMutation("register.save_profile");

  const handleRoleSelection = (selectedRole: string) => {
    setRole(selectedRole);
  };

  const handleBack = () => {
    setRole("");
    setErrorMessage("");
  };

  const handleVerify = async () => {
    try {
      const response = await verifyMutation.mutateAsync({
        data: JSON.stringify({
          role,
          invitationCode,
        }),
      });

      if (response) {
        const roleResponse = await saveRoleMutation.mutateAsync({
          data: JSON.stringify({
            userId: userId,
            role: role,
          }),
        });

        if (roleResponse === true) {
          if (role === "planner") {
            router.push("project");
          } else {
            router.push("/");
          }
        } else {
          setErrorMessage(roleResponse.message || "Failed to save role.");
        }
      } else {
        setErrorMessage("Invalid Invitation Code");
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.");
    }
  };

  const handleSkip = () => {
    router.push("/");
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prevProfile) => ({
      ...prevProfile,
      [name]: value,
    }));
  };

  const handleFinishCitizen = async () => {
    try {
      // Call register.profile API with basic information
      const responseProfile = await saveProfileMutation.mutateAsync({
        data: JSON.stringify({
          userId: userId,
          profile: profile,
        }),
      });
      const response = await saveRoleMutation.mutateAsync({
        data: JSON.stringify({
          userId: userId,
          role: role,
        }),
      });
      if (response === true) {
        router.push("/");
      } else {
        setErrorMessage(response.message || "Failed to save role.");
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.");
    }
  };

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        {!role ? (
          <div className={styles.roleSelection}>
            <div
              className={styles.roleOption}
              onClick={() => handleRoleSelection("planner")}
            >
              <Image
                src="/planner.png"
                alt="Planner Icon"
                width={100}
                height={100}
              />
              <button>Planner</button>
            </div>
            <div
              className={styles.roleOption}
              onClick={() => handleRoleSelection("policy_maker")}
            >
              <Image
                src="/policy_maker.png"
                alt="Policy Maker Icon"
                width={100}
                height={100}
              />
              <button>Policy Maker</button>
            </div>
            <div
              className={styles.roleOption}
              onClick={() => handleRoleSelection("citizen")}
            >
              <Image
                src="/citizen.png"
                alt="Citizen Icon"
                width={100}
                height={100}
              />
              <button>Citizen</button>
            </div>
          </div>
        ) : (
          <div className={styles.roleForm}>
            {role === "citizen" ? (
              <div className={styles.citizenForm}>
                <h2>Basic Information</h2>
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={profile.firstName}
                  onChange={handleProfileChange}
                />
                <input
                  type="text"
                  name="middleName"
                  placeholder="Middle Name"
                  value={profile.middleName}
                  onChange={handleProfileChange}
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={profile.lastName}
                  onChange={handleProfileChange}
                />
                <input
                  type="text"
                  name="age"
                  placeholder="Age"
                  value={profile.age}
                  onChange={handleProfileChange}
                />
                <input
                  type="text"
                  name="gender"
                  placeholder="Gender"
                  value={profile.gender}
                  onChange={handleProfileChange}
                />
                <input
                  type="text"
                  name="affiliation"
                  placeholder="Affiliation"
                  value={profile.affiliation}
                  onChange={handleProfileChange}
                />
                <input
                  type="text"
                  name="profession"
                  placeholder="Profession"
                  value={profile.profession}
                  onChange={handleProfileChange}
                />
                <input
                  type="text"
                  name="nationality"
                  placeholder="Nationality"
                  value={profile.nationality}
                  onChange={handleProfileChange}
                />
                <div className={styles.citizenButtons}>
                  <button onClick={handleBack}>Back</button>
                  <button onClick={handleSkip}>Skip</button>
                  <button onClick={handleFinishCitizen}>Finish</button>
                </div>
              </div>
            ) : (
              <div>
                <h2>{`Register as ${
                  role.charAt(0).toUpperCase() + role.slice(1)
                }`}</h2>
                <input
                  type="text"
                  placeholder="Enter Invitation Code"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                />
                <button onClick={handleVerify}>Finish</button>
                {errorMessage && <p className={styles.error}>{errorMessage}</p>}
                <button onClick={handleBack}>Back</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default RoleSelection;

type RoleSelectionPageProps = InferGetServerSidePropsType<
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
