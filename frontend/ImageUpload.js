import React from "react";

export default function ImageUpload({ preview, onFileSelected }) {
  return (
    <div>
      <div className="dropzone" onClick={() => document.getElementById("fileInput").click()}>
        {preview ? <img src={preview} alt="preview" /> : "Click to upload knee X-ray"}
      </div>
      <input
        id="fileInput"
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => e.target.files[0] && onFileSelected(e.target.files[0])}
      />
    </div>
  );
}
