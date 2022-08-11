import { BiSearch, BiUser } from "react-icons/bi";
import { FC, useState } from "react";
import { signOut, useSession } from "next-auth/react";

import { AiOutlinePlus } from "react-icons/ai";
import ClickAwayListener from "../Shared/ClickAwayListener";
import Image from "next/future/image";
import { IoLogOutOutline } from "react-icons/io5";
import Link from "next/link";

const Navbar: FC = () => {
  const { data: session, status } = useSession();

  const [isDropdownOpened, setIsDropdownOpened] = useState(false);

  return (
    <nav className="border-b">
      <div className="flex justify-center mx-4">
        <div className="w-full max-w-[1150px] flex justify-between items-center h-[60px]">
          <Link href="/">
            <a className="flex items-end gap-1">
              <Image src="/logo.png" alt="Logo" width={30} height={30} />
              <span className="text-2xl leading-[1] font-bold">TopTop</span>
            </a>
          </Link>
          <div className="relative w-[360px] h-[46px]">
            <input
              className="w-full h-full outline-none bg-gray-1 rounded-full pl-4 pr-14 border border-transparent focus:border-gray-400 transition"
              type="text"
              placeholder="Search accounts and videos..."
            />
            <div className="absolute h-8 w-[1px] right-12 top-1/2 -translate-y-1/2 bg-gray-300"></div>
            <button className="absolute right-3 top-1/2 -translate-y-1/2">
              <BiSearch className="fill-gray-400 w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Link href={status === "authenticated" ? "/upload" : "/sign-in"}>
              <a className="border rounded flex items-center gap-2 h-9 px-3 border-gray-200 bg-white hover:bg-gray-100 transition">
                <AiOutlinePlus className="w-5 h-5" />
                <span>Upload</span>
              </a>
            </Link>
            {status === "unauthenticated" ? (
              <Link href="/sign-in">
                <a className="rounded h-9 px-6 bg-pink text-white flex items-center hover:brightness-105 transition">
                  Log In
                </a>
              </Link>
            ) : status === "authenticated" ? (
              <ClickAwayListener onClickAway={() => setIsDropdownOpened(false)}>
                {(ref) => (
                  <div ref={ref} className="relative">
                    <button
                      onClick={() => setIsDropdownOpened(!isDropdownOpened)}
                    >
                      <Image
                        width={36}
                        height={36}
                        className="rounded-full"
                        src={session.user?.image!}
                        alt="Avatar"
                      />
                    </button>
                    <div
                      className={`absolute shadow-[rgb(0_0_0_/_12%)_0px_4px_16px] bg-white top-[120%] right-0 py-2 flex flex-col items-stretch [&>*]:whitespace-nowrap rounded-md transition-all z-50 ${
                        isDropdownOpened
                          ? "opacity-100 visible"
                          : "opacity-0 invisible"
                      }`}
                    >
                      <Link href="/profile">
                        <a className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 transition">
                          <BiUser className="fill-black w-6 h-6" />
                          <span>Profile</span>
                        </a>
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 transition"
                      >
                        <IoLogOutOutline className="fill-black w-6 h-6" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </ClickAwayListener>
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
