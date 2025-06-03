import React from 'react';

function FileUploader() {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    console.log(file);
  };

  return (
    <div>
      <input type="file" onChange={handleFileUpload} />
    </div>
  );
}

export default FileUploader;
