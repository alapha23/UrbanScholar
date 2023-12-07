import { createSSGHelpers } from "@trpc/react/ssg";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import { unstable_getServerSession as getServerSession } from "next-auth";
import superjson from "superjson";

import Main from "@/components/Home/Main";
import Sidebar from "@/components/Home/Sidebar";
import Navbar from "@/components/Layout/Navbar";
import Meta from "@/components/Shared/Meta";
import { prisma } from "@/server/db/client";
import { appRouter } from "@/server/router";

import { authOptions } from "./api/auth/[...nextauth]";

const Home: NextPage<HomeProps> = ({}) => {
  return (
    <>
     <Navbar />
      <div className="flex justify-center mx-4">
        <div className="w-full max-w-[1150px] flex">
         <Main origin={origin!} />
        </div>
      </div>
    </>
  );
};

export default Home;

type HomeProps = InferGetServerSidePropsType<typeof getServerSideProps>;

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
      props: {},
    };
  }
  else {
    return {
      redirect: {
        destination: "/sign-in",
        permanent: true,
      },
      props: {},
    };
  }
};
