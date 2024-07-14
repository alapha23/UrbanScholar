import type { NextPage } from "next";
import { useEffect } from "react";

import Navbar from "@/components/Layout/Navbar";

const Index: NextPage = () => {

  useEffect(() => {
  }, []);

  return (
    <>
      <div className="min-h-screen flex flex-col items-stretch">
        <Navbar />
      </div>
    </>
  );
};

export default Index;