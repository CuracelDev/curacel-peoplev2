import { createUploadthing, type FileRouter } from 'uploadthing/next'

const f = createUploadthing()

// FileRouter for app with different upload endpoints
export const ourFileRouter = {
  // Endpoint for employee document uploads (PDFs, images)
  employeeDocuments: f({
    pdf: { maxFileSize: '8MB', maxFileCount: 1 },
    image: { maxFileSize: '8MB', maxFileCount: 1 },
    'application/msword': { maxFileSize: '8MB', maxFileCount: 1 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxFileSize: '8MB', maxFileCount: 1 },
  })
    .onUploadComplete(async ({ file }) => {
      // This code runs on your server after upload
      console.log('File uploaded:', file.url)
      return { url: file.url }
    }),

  // Endpoint for public candidate resume uploads (no auth required)
  candidateResume: f({
    pdf: { maxFileSize: '8MB', maxFileCount: 1 },
    'application/msword': { maxFileSize: '8MB', maxFileCount: 1 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxFileSize: '8MB', maxFileCount: 1 },
  })
    .onUploadComplete(async ({ file }) => {
      console.log('Candidate resume uploaded:', file.url)
      return { url: file.url }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
