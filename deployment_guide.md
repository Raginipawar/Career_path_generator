# Deployment & Integration Guide (Person 5)

## 1. GitHub Actions (Automated Testing)
The `.github/workflows/ci.yml` file is already created. To activate it:
1. Stage all the files we created: `git add .`
2. Commit your changes: `git commit -m "Add CI, render blueprint, and env configs"`
3. Push to your repository: `git push origin main`
* **What happens next:** Go to your repository on GitHub $\rightarrow$ **"Actions"** tab. You will see a workflow running automatically that installs dependencies, checks Python syntax, and typechecks the Node.js backend. It runs on every future push.

## 2. Deploying the RAG Service to Hugging Face Spaces
Person 3 already built the **RAG Service** with a `Dockerfile` exposed on port `8000`. Here's exactly how to deploy it on Hugging Face (HF) Spaces:
1. Go to [Hugging Face Spaces](https://huggingface.co/spaces) and click **"Create new Space"**.
2. **Space name**: e.g., `career-path-generator-rag`.
3. **Select the Space SDK**: Choose **"Docker"** (then select "Blank").
4. **Hardware**: "CPU Basic" (Free) is fine for your current ChromaDB + Groq setup.
5. Under **"Space settings"** $\rightarrow$ **"Variables and secrets"**, add the following Secrets (from your `.env`):
   - `GROQ_API_KEY` = `[your key]`
   - *(No need to set PORT or HOST, HF Docker Spaces figure this out automatically, but HF maps internal port `7860` by default. Change the end of your Dockerfile to `CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]` right before deploying, or set the `PORT` env var in HF settings to 8000).*
6. Clone the HF Space repository.
7. Copy the contents of the `/rag-service` (or root where `main.py` and `Dockerfile` are) into the HF Space repository.
8. `git add .`, `git commit -m "Deploy RAG"`, and `git push`.
9. The Space will build the Docker container and start your FastAPI server. The public URL will be `https://[your-username]-career-path-generator-rag.hf.space`.

## 3. Deploying the Backend on Render
The `render.yaml` file acts as an infrastructure-as-code blueprint.
1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Click **"New +"** and select **"Blueprint"** (Not "Web Service").
3. Connect your GitHub repository containing the Code.
4. Render will read the `render.yaml` file automatically to provision the service named *career-path-backend*.
5. On the Render Dashboard, go to your new service $\rightarrow$ **Environment**, and manually populate the "Sync: False" environment variables from `.env`. (e.g. `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, `FRONTEND_URL`).
   - **Important**: Make sure `RAG_SERVICE_URL` points to the Hugging Face URL you generated in Step 2.

## 4. Testing with Postman
I have created `postman_collection.json`. Here is how you use it to test everything:
1. Open the **Postman** app.
2. Click **"Import"** (located near "New" at the top left).
3. Select the `postman_collection.json` file from your Desktop.
4. Open the newly imported folder "Career Path Generator".
5. In Postman, go to **Variables** on the left or top right for this collection.
6. Make sure `api_url` is set to `http://localhost:4000` (or your Render URL once deployed).
7. Run the requests in order (1 $\rightarrow$ 5).
8. *Note*: After you run **"2. Auth - Login"**, you need to copy the `token` from the response and paste it into the `jwt_token` variable in Postman to unlock the profile and roadmap endpoints.

## 5. Deploying the Frontend on Vercel
Now that Person 1 has pushed the `career-path-gen` Next.js frontend, you can deploy it:
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** $\rightarrow$ **"Project"**.
2. Connect your GitHub repository.
3. Under **"Framework Preset"**, ensure **Next.js** is selected.
4. Under **"Root Directory"**, click **"Edit"** and select the `/career-path-gen` folder.
5. Under **"Environment Variables"**, add the variable from your `.env.example`:
   - `NEXT_PUBLIC_API_URL` = `[your Render backend URL]` *(e.g. `https://career-path-backend.onrender.com`)*
6. Click **Deploy**. Vercel will automatically run `npm run build` inside that directory.
7. Once deployed, test the live URL to ensure it successfully communicates with your Render Backend, which talks to your Hugging Face RAG service.
