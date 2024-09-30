import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  X,
  Upload,
  FileIcon,
  Image as LucideImage,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useParams } from "react-router-dom";
import { saveAs } from "file-saver";

interface SendingReceivingPageProps {
  webSocket: WebSocket | null;
}

type FileType = "image" | "pdf" | "csv" | "other";

export function SendingReceivingPage({ webSocket }: SendingReceivingPageProps) {
  const { passcode } = useParams<{ passcode: string }>();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "complete" | "error"
  >("idle");
  const [downloadStatus, setDownloadStatus] = useState<
    "idle" | "downloading" | "complete" | "error"
  >("idle");
  const [fileName, setFileName] = useState("");
  const transferId = useRef<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileType, setFileType] = useState<FileType>("other");
  const totalChunksRef = useRef(0);
  const receivedChunksRef = useRef<string[]>([]);
  const fileTypeRef = useRef<string>("");

  useEffect(() => {
    if (!webSocket) {
      console.error("WebSocket not available");
      setErrorMessage("Connection error. Please try again.");
      return;
    }

    webSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message.type);

      switch (message.type) {
        case "FILE_TRANSFER_INIT":
          handleFileTransferInit(message);
          break;
        case "FILE_CHUNK_RECEIVED":
          handleFileChunkReceived(message);
          break;
        case "FILE_TRANSFER_INIT_RECEIVED":
          transferId.current = message.transferId;
          console.log("FILE_TRANSFER_INIT_RECEIVED");
          break;
        case "ERROR":
          handleError(message);
          break;
      }
    };

    return () => {
      // Cleanup logic if needed
    };
  }, [passcode, webSocket]);

  const handleFileTransferInit = (message: any) => {
    console.log("FILE_TRANSFER_INIT", message);
    setDownloadStatus("downloading");
    setFileName(message.fileName);
    fileTypeRef.current = message.fileType;
    setFileType(getFileType(message.fileType));

    transferId.current = message.transferId;
    totalChunksRef.current = message.totalChunks;
    receivedChunksRef.current = [];
  };

  const handleFileChunkReceived = (message: any) => {
    receivedChunksRef.current.push(message.chunkData);
    const progress = Math.round(
      (receivedChunksRef.current.length / totalChunksRef.current) * 100
    );
    setDownloadProgress(progress);

    if (receivedChunksRef.current.length === totalChunksRef.current) {
      console.log("All chunks received, processing file...");
      setDownloadStatus("complete");
      setTimeout(() => {
        setDownloadStatus("idle");
        processCompletedFile();
      }, 1200);
    }
  };

  const handleError = (message: any) => {
    console.error("Error:", message.message);
    setErrorMessage(message.message || "An error occurred during transfer.");
  };

  const getFileType = (mimeType: string): FileType => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType === "text/csv" || mimeType === "application/vnd.ms-excel")
      return "csv";
    return "other";
  };

  const processCompletedFile = () => {
    try {
      const completeBase64 = receivedChunksRef.current.join("");
      const arrayBuffer = base64ToArrayBuffer(completeBase64);
      const blob = new Blob([arrayBuffer], { type: fileTypeRef.current });

      switch (fileType) {
        case "image":
          handleImageFile(blob);
          break;
        case "pdf":
          handlePdfFile(blob);
          break;
        case "csv":
          handleCsvFile(blob);
          break;
        default:
          saveAs(blob, fileName);
      }

      console.log("File processing complete");
    } catch (error) {
      console.error("Error processing file:", error);
      setErrorMessage("Error processing file. Please try again.");
    }
  };

  const handleImageFile = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const img = new Image(); // This will now use the built-in Image constructor
    img.onload = () => {
      // You can perform additional processing here if needed
      saveAs(blob, fileName);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handlePdfFile = (blob: Blob) => {
    // You can add PDF.js integration here for preview if needed
    saveAs(blob, fileName);
  };

  const handleCsvFile = async (blob: Blob) => {
    // const text = await blob.text();
    // const rows = text.split("\n").map((row) => row.split(","));
    // You can perform additional CSV processing here if needed
    saveAs(blob, fileName);
  };

  const base64ToArrayBuffer = (base64: string) => {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error("Error in base64ToArrayBuffer:", error);
      throw new Error("Failed to decode base64 string");
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFileName(file.name);
      setFileType(getFileType(file.type));
      setUploadStatus("uploading");
      sendFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "application/pdf": [],
      "text/csv": [],
      "application/vnd.ms-excel": [],
    },
  });

  const sendFile = async (file: File) => {
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    totalChunksRef.current = Math.ceil(file.size / CHUNK_SIZE);

    try {
      await webSocket?.send(
        JSON.stringify({
          type: "TRANSFER_FILE",
          targetPasscode: passcode,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          totalChunks: totalChunksRef.current,
        })
      );

      await waitForTransferInit();

      for (
        let currentChunk = 0;
        currentChunk < totalChunksRef.current;
        currentChunk++
      ) {
        const start = currentChunk * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = await readChunkAsArrayBuffer(file.slice(start, end));
        sendChunk(chunk, currentChunk);
        updateUploadProgress(currentChunk);
      }

      finishUpload();
    } catch (error) {
      handleUploadError(error);
    }
  };

  const readChunkAsArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(blob);
    });
  };
  const waitForTransferInit = () => {
    return new Promise<void>((resolve) => {
      const listener = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (message.type === "FILE_TRANSFER_INIT_RECEIVED") {
          transferId.current = message.transferId;
          webSocket?.removeEventListener("message", listener);
          resolve();
        }
      };
      webSocket?.addEventListener("message", listener);
    });
  };

  const sendChunk = (chunkData: ArrayBuffer, chunkNumber: number) => {
    const base64ChunkData = arrayBufferToBase64(chunkData);
    webSocket?.send(
      JSON.stringify({
        type: "FILE_CHUNK",
        targetPasscode: passcode,
        chunkData: base64ChunkData,
        transferId: transferId.current,
        chunkNumber,
      })
    );
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const updateUploadProgress = (currentChunk: number) => {
    const progress = Math.round(
      ((currentChunk + 1) / totalChunksRef.current) * 100
    );
    setUploadProgress(progress);
  };

  const finishUpload = () => {
    setUploadStatus("complete");
    setTimeout(() => {
      setUploadStatus("idle");
    }, 1200);
  };

  const handleUploadError = (error: any) => {
    console.error("Error sending file:", error);
    setUploadStatus("error");
    setErrorMessage("An error occurred during upload.");
  };

  const resetUpload = () => {
    setUploadStatus("idle");
    setUploadProgress(0);
    setFileName("");
    setFileType("other");
  };

  const resetDownload = () => {
    setDownloadStatus("idle");
    setDownloadProgress(0);
    receivedChunksRef.current = [];
    setFileType("other");
  };

  const getFileIcon = () => {
    switch (fileType) {
      case "image":
        return <LucideImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />;
      case "pdf":
        return <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />;
      case "csv":
        return (
          <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        );
      default:
        return <FileIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />;
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-lg shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          P2P File Sharing
        </h1>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Send File
            </h2>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? "border-blue-500 bg-blue-500 bg-opacity-10"
                  : "border-gray-600 hover:border-gray-500"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-300">
                Drag &amp; drop an image, PDF, or CSV file here, or click to
                select
              </p>
            </div>
            <AnimatePresence>
              {uploadStatus !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">{fileName}</span>
                    <span className="text-gray-400">{uploadProgress}%</span>
                  </div>
                  <Progress
                    value={uploadProgress}
                    className="h-2 bg-gray-700"
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-gray-300">
                      {uploadStatus === "uploading"
                        ? "Uploading..."
                        : "Upload complete"}
                    </span>
                    <Button
                      onClick={resetUpload}
                      variant="outline"
                      size="sm"
                      className="text-red-500 border-red-500 hover:bg-red-500 hover:bg-opacity-10"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Receive File
            </h2>
            {downloadStatus === "idle" ? (
              <div className="border-2 border-gray-600 rounded-lg p-8 text-center">
                {getFileIcon()}
                <p className="text-gray-300 mb-4">
                  Waiting for incoming file...
                </p>
              </div>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">{fileName}</span>
                    <span className="text-gray-400">{downloadProgress}%</span>
                  </div>
                  <Progress
                    value={downloadProgress}
                    className="h-2 bg-gray-700"
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-gray-300">
                      {downloadStatus === "downloading"
                        ? "Downloading..."
                        : "Download complete"}
                    </span>
                    <Button
                      onClick={resetDownload}
                      variant="outline"
                      size="sm"
                      className="text-red-500 border-red-500 hover:bg-red-500 hover:bg-opacity-10"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
          {errorMessage && (
            <div className="col-span-2 text-red-500 text-center mt-4">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
