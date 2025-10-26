"use client";

import { useState } from "react";
import { Upload, Button, message, Card } from "antd";
import { UploadOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";

interface FileUploadProps {
  onFilesLoaded: () => void;
  onLoadData: (
    pinFile: File,
    polygonFile: File,
    csvFile: File
  ) => Promise<void>;
}

export default function FileUpload({
  onFilesLoaded,
  onLoadData,
}: FileUploadProps) {
  const [pinFile, setPinFile] = useState<File | null>(null);
  const [polygonFile, setPolygonFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePinUpload = (file: File) => {
    setPinFile(file);
    message.success(`ピンファイル「${file.name}」を選択しました`);
    return false; // 自動アップロードを防ぐ
  };

  const handlePolygonUpload = (file: File) => {
    setPolygonFile(file);
    message.success(`ポリゴンファイル「${file.name}」を選択しました`);
    return false;
  };

  const handleCsvUpload = (file: File) => {
    setCsvFile(file);
    message.success(`CSVファイル「${file.name}」を選択しました`);
    return false;
  };

  const handleLoadData = async () => {
    if (!pinFile || !polygonFile || !csvFile) {
      message.error("3つのファイルすべてを選択してください");
      return;
    }

    setLoading(true);
    try {
      await onLoadData(pinFile, polygonFile, csvFile);
      message.success("データの読み込みが完了しました");
      onFilesLoaded();
    } catch (error) {
      console.error("Failed to load data:", error);
      message.error("データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const allFilesSelected = pinFile && polygonFile && csvFile;

  return (
    <Card
      title="データファイルをアップロード"
      className="mb-4"
      style={{ maxWidth: 800 }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ピンファイル */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-gray-700">
                1. 農地ピン（GeoJSON）
              </span>
              {pinFile && (
                <CheckCircleOutlined className="text-green-500 text-lg" />
              )}
            </div>
            <Upload
              accept=".geojson,.json"
              beforeUpload={handlePinUpload}
              maxCount={1}
              showUploadList={{
                showRemoveIcon: true,
              }}
              onRemove={() => setPinFile(null)}
            >
              <Button icon={<UploadOutlined />} block>
                {pinFile ? "ファイルを変更" : "ファイルを選択"}
              </Button>
            </Upload>
            {pinFile && (
              <div className="mt-2 text-xs text-gray-500 truncate">
                {pinFile.name}
              </div>
            )}
          </div>

          {/* ポリゴンファイル */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-gray-700">
                2. ポリゴン（GeoJSON）
              </span>
              {polygonFile && (
                <CheckCircleOutlined className="text-green-500 text-lg" />
              )}
            </div>
            <Upload
              accept=".geojson,.json"
              beforeUpload={handlePolygonUpload}
              maxCount={1}
              showUploadList={{
                showRemoveIcon: true,
              }}
              onRemove={() => setPolygonFile(null)}
            >
              <Button icon={<UploadOutlined />} block>
                {polygonFile ? "ファイルを変更" : "ファイルを選択"}
              </Button>
            </Upload>
            {polygonFile && (
              <div className="mt-2 text-xs text-gray-500 truncate">
                {polygonFile.name}
              </div>
            )}
          </div>

          {/* CSVファイル */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-gray-700">
                3. 耕作者データ（CSV）
              </span>
              {csvFile && (
                <CheckCircleOutlined className="text-green-500 text-lg" />
              )}
            </div>
            <Upload
              accept=".csv"
              beforeUpload={handleCsvUpload}
              maxCount={1}
              showUploadList={{
                showRemoveIcon: true,
              }}
              onRemove={() => setCsvFile(null)}
            >
              <Button icon={<UploadOutlined />} block>
                {csvFile ? "ファイルを変更" : "ファイルを選択"}
              </Button>
            </Upload>
            {csvFile && (
              <div className="mt-2 text-xs text-gray-500 truncate">
                {csvFile.name}
              </div>
            )}
          </div>
        </div>

        {/* 読み込みボタン */}
        <div className="flex justify-center pt-4">
          <Button
            type="primary"
            size="large"
            onClick={handleLoadData}
            loading={loading}
            disabled={!allFilesSelected}
            className="px-12"
          >
            データを読み込む
          </Button>
        </div>

        {/* 説明テキスト */}
        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-gray-700">
            <strong>使い方：</strong>
          </p>
          <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1 mt-2">
            <li>農地ピンのGeoJSONファイルを選択</li>
            <li>ポリゴンのGeoJSONファイルを選択</li>
            <li>耕作者データのCSVファイルを選択</li>
            <li>「データを読み込む」ボタンをクリック</li>
          </ol>
          <p className="text-xs text-gray-500 mt-2">
            ※ ページをリロードするとアップロードしたデータは消えます
          </p>
        </div>
      </div>
    </Card>
  );
}
