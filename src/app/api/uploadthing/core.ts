import { createUploadthing, type FileRouter } from 'uploadthing/next'

const f = createUploadthing()

// FileRouter for app with different upload endpoints
export const ourFileRouter = {
  // Endpoint for employee document uploads (PDFs, images)
  employeeDocuments: f({
    pdf: { maxFileSize: '4MB', maxFileCount: 1 },
    image: { maxFileSize: '4MB', maxFileCount: 1 },
  })
    .onUploadComplete(async ({ file }) => {
      // This code runs on your server after upload
      console.log('File uploaded:', file.url)
      return { url: file.url }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
