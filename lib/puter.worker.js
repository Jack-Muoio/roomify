const PROJECT_PREFIX = 'roomify_project_';
const PUBLIC_PROJECT_PREFIX = 'roomify_public_';

const jsonError = (status, message, extra= {}) => {
  return new Response(JSON.stringify({error: message, ...extra}), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}

const getUserId = async (userPuter) => {
  try {
    const user = await userPuter.auth.getUser()
    return user?.uuid || null
  } catch {
    return null
  }
}

router.post('/api/projects/save', async ({ request, user }) => {
  try {
    const userPuter = user.puter;

    if(!userPuter) return jsonError(401, 'Authentication failed')

    const body = await request.json()
    const project = body?.project

    if(!project?.id || !project?.sourceImage) return jsonError(400, 'Project ID and source image are required')
    const payload = {
      ...project,
      updatedAt: new Date().toISOString()
    }

    const userId = await getUserId(userPuter)
    if(!userId) return jsonError(401, 'Authentication failed')

    const key = `${PROJECT_PREFIX}${project.id}`
    await userPuter.kv.set(key, payload)

    return {saved: true, id: project.id, project:payload}

  } catch(e) {
    return jsonError(500, 'Failed to save project', {message: e.message || 'Unknown error'})
  }
})

router.get('/api/projects/list', async ({ request, user }) => {
   try {
    const userPuter = user.puter;
    if (!userPuter) return jsonError(401, 'Authentication failed');

    const userId = await getUserId(userPuter);
    if (!userId) return jsonError(401, 'Authentication failed');

    // Get private projects
    const privateProjects = (await userPuter.kv.list(PROJECT_PREFIX, true))
      .map(({value}) => ({...value, isPublic: false}))

    // Get public projects
    const publicProjects = (await userPuter.kv.list(PUBLIC_PROJECT_PREFIX, true))
      .map(({value}) => ({...value, isPublic: true}))

    // Combine them
    const projects = [...privateProjects, ...publicProjects];

    // Sort projects by updatedAt descending
    projects.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.timestamp || 0).getTime();
      const dateB = new Date(b.updatedAt || b.timestamp || 0).getTime();
      return dateB - dateA;
    });

    return { projects };
  } catch (e) {
    return jsonError(500, 'Failed to list projects', { message: e.message || 'Unknown error' });
  }
});

router.get('/api/projects/get', async ({ request, user }) => {
  try {
    const userPuter = user.puter;
    if (!userPuter) return jsonError(401, 'Authentication failed');

    const userId = await getUserId(userPuter);
    if (!userId) return jsonError(401, 'Authentication failed');

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) return jsonError(400, 'Project ID is required');

    const privateKey = `${PROJECT_PREFIX}${id}`;
    let project = await userPuter.kv.get(privateKey);

    if (!project) {
        const publicKey = `${PUBLIC_PROJECT_PREFIX}${id}`;
        project = await userPuter.kv.get(publicKey);
    }

    if (!project) return jsonError(404, 'Project not found');

    return { project };
  } catch (e) {
    return jsonError(500, 'Failed to get project', { message: e.message || 'Unknown error' });
  }
});

router.post('/api/projects/share', async ({ request, user }) => {
  try {
    const userPuter = user.puter;
    if (!userPuter) return jsonError(401, 'Authentication failed');

    const body = await request.json();
    const projectId = body?.id;

    if (!projectId) return jsonError(400, 'Project ID is required');

    const userInfo = await userPuter.auth.getUser();
    const userId = userInfo?.uuid;
    const username = userInfo?.username;

    if (!userId) return jsonError(401, 'Authentication failed');

    const privateKey = `${PROJECT_PREFIX}${projectId}`;
    const publicKey = `${PUBLIC_PROJECT_PREFIX}${projectId}`;

    // Get the project from private KV
    const project = await userPuter.kv.get(privateKey);
    if (!project) return jsonError(404, 'Project not found in private storage');

    const payload = {
      ...project,
      isPublic: true,
      ownerId: userId,
      ownerUsername: username,
      sharedAt: new Date().toISOString()
    };

    // Note: To use a global KV store in a puter worker script, 
    // we use `app.kv` or just `puter.kv` if using the global object.
    // For now we will use userPuter.kv just to prove it works
    await userPuter.kv.set(publicKey, payload);
    await userPuter.kv.del(privateKey);

    return { success: true, project: payload };
  } catch (e) {
    return jsonError(500, 'Failed to share project', { message: e.message || 'Unknown error' });
  }
});

router.post('/api/projects/unshare', async ({ request, user }) => {
  try {
    const userPuter = user.puter;
    if (!userPuter) return jsonError(401, 'Authentication failed');

    const body = await request.json();
    const projectId = body?.id;

    if (!projectId) return jsonError(400, 'Project ID is required');

    const userId = await getUserId(userPuter);
    if (!userId) return jsonError(401, 'Authentication failed');

    const publicKey = `${PUBLIC_PROJECT_PREFIX}${projectId}`;
    const privateKey = `${PROJECT_PREFIX}${projectId}`;

    const project = await userPuter.kv.get(publicKey);
    if (!project) return jsonError(404, 'Project not found in public storage');

    // Verify ownership
    if (project.ownerId !== userId) {
        return jsonError(403, 'Unauthorized to unshare this project');
    }

    const payload = {
      ...project,
      isPublic: false,
      updatedAt: new Date().toISOString()
    };
    
    // Remove sharing metadata
    delete payload.ownerUsername;
    delete payload.sharedAt;

    // Add back to private KV
    await userPuter.kv.set(privateKey, payload);

    // Remove from public KV
    await userPuter.kv.del(publicKey);

    return { success: true, project: payload };
  } catch (e) {
    return jsonError(500, 'Failed to unshare project', { message: e.message || 'Unknown error' });
  }
});
