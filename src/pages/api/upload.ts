/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';

import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('/api/upload');
  if (req.method === 'POST') {
    const form = new formidable.IncomingForm();
    // @ts-ignore
    form.uploadDir = path.resolve(__dirname, '../../../../storage/user/');

    // @ts-ignore
    form.parse(req, (err: { message: any; }, _fields: any, files: { file: any; }) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
        return;
      }

      const file = files.file as File;
      // Check if file is defined
      if (!file || !file.originalFilename) {
        console.log('No file uploaded');
        res.status(400).json({ error: 'No file uploaded.' });
        return;
      }
      const oldPath = file.filepath;
      // @ts-ignore
      const newPath = path.resolve(form.uploadDir, file.originalFilename);

      // @ts-ignore
      let filename = file.originalFilename;
      const extension = path.extname(filename);
      const basename = path.basename(filename, extension);
      if (fs.existsSync(newPath)) {
        // Generate a 4-char random string
        const randomString = Math.random().toString(36).substr(2, 4);
        // If file exists, append random string before the suffix
        filename = `${basename}-${randomString}${extension}`;
      }
      // @ts-ignore
      fs.rename(oldPath, path.resolve(form.uploadDir, filename), (err) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
      });
    });
    res.status(200).json({ status: 'success' });
  } else {
    res.status(405).json({ error: 'Method not allowed. Please POST.' });
  }
}