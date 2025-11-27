import { createContext, useContext } from "react";
import { observer } from "mobx-react-lite";

import FileLoader from "components/file-loader";
import Editor from "components/editor";
import fileStore from "store/file.store";
import type { FileStore } from "store/file.store";

import { ReactComponent as DownloadIcon } from "icons/download.svg";
import { ReactComponent as CloseIcon } from "icons/close.svg";

export const FileContext = createContext<FileStore>(fileStore);

function App() {
  const fileStore = useContext(FileContext);

  return (
    <FileContext.Provider value={fileStore}>
      <div className="flex flex-col h-full w-full">
        <header>
          <h1 className="flex items-center text-4xl mb-4">
            Bitburner Save Editor
            {fileStore.ready && (
              <div className="ml-4 flex items-center gap-2">
                {fileStore.hasChanges && (
                  <>
                    <span className="text-sm text-yellow-400 mr-2">
                      Unsaved changes
                    </span>
                    <button
                      className="p-2 rounded bg-red-800 hover:bg-red-700"
                      onClick={fileStore.revertChanges}
                      title="Revert all changes"
                    >
                      <CloseIcon className="h-8 w-8" />
                    </button>
                  </>
                )}
                <button
                  className="p-2 rounded bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={fileStore.downloadFile}
                  disabled={!fileStore.hasChanges}
                  title={fileStore.hasChanges ? "Download modified save" : "No changes to download"}
                >
                  <DownloadIcon className="h-8 w-8" />
                </button>
              </div>
            )}
          </h1>
          <FileLoader />
        </header>
        <Editor />
      </div>
    </FileContext.Provider>
  );
}

export default observer(App);
