import { supabase } from './supabase';
import { createDefaultDatabase, normalizeDatabase } from './data';

export async function loadDatabaseFromSupabase() {
    try {
        // Fetch all data concurrently
        const [
            { data: groupsData, error: groupsError },
            { data: companiesData, error: companiesError },
            { data: usersData, error: usersError },
            { data: auditLogData, error: auditLogError }
        ] = await Promise.all([
            supabase.from('groups').select('*'),
            supabase.from('companies').select('*'),
            supabase.from('users').select('*'),
            supabase.from('audit_log').select('*').order('created_at', { ascending: false })
        ]);

        if (groupsError || companiesError || usersError || auditLogError) {
            console.error('Error loading from Supabase:', groupsError || companiesError || usersError || auditLogError);
            throw new Error('Failed to fetch from Supabase');
        }

        // If completely empty, we might want to seed it, but let App handle empty states
        if (!groupsData.length && !usersData.length) {
            return null; // Signals we need to seed
        }

        // Reconstruct the nested object
        const reconstructedGroups = groupsData.map(group => {
            const groupCompanies = companiesData.filter(c => c.group_id === group.id);
            return {
                id: group.id,
                label: group.label,
                description: group.description,
                companies: groupCompanies.map(c => ({
                    id: c.id,
                    name: c.name,
                    type: c.type,
                    directors: c.directors || []
                }))
            };
        });

        const reconstructedUsers = usersData.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            allowedGroupIds: user.allowed_group_ids || [],
            active: user.active,
            canDownload: user.can_download !== false,
        }));

        const reconstructedAudit = auditLogData.map(log => ({
            id: log.id,
            actorEmail: log.actor_email,
            action: log.action,
            createdAt: log.created_at
        }));

        return normalizeDatabase({
            groups: reconstructedGroups,
            users: reconstructedUsers,
            auditLog: reconstructedAudit
        });

    } catch (error) {
        console.error('Database load failed:', error);
        return null;
    }
}

export async function saveDatabaseToSupabase(database) {
    // 1. Extract flat lists
    const groups = database.groups.map(g => ({
        id: g.id,
        label: g.label,
        description: g.description
    }));

    const companies = [];
    database.groups.forEach(g => {
        g.companies.forEach(c => {
            companies.push({
                id: c.id,
                group_id: g.id,
                name: c.name,
                type: c.type,
                directors: c.directors
            });
        });
    });

    const users = database.users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        allowed_group_ids: u.allowedGroupIds,
        active: u.active,
        can_download: u.canDownload !== false,
    }));

    const auditLogs = database.auditLog.map(log => ({
        id: log.id,
        actor_email: log.actorEmail,
        action: log.action,
        created_at: log.createdAt || new Date().toISOString()
    }));

    try {
        // Upsert groups
        if (groups.length) {
            const { error } = await supabase.from('groups').upsert(groups);
            if (error) console.error('Groups upsert error:', error);
        }
        
        // Upsert companies
        if (companies.length) {
            const { error } = await supabase.from('companies').upsert(companies);
            if (error) console.error('Companies upsert error:', error);
        }

        // Upsert users
        if (users.length) {
            const { error } = await supabase.from('users').upsert(users);
            if (error) console.error('Users upsert error:', error);
        }

        // Upsert audit log
        if (auditLogs.length) {
            const { error } = await supabase.from('audit_log').upsert(auditLogs);
            if (error) console.error('Audit log upsert error:', error);
        }

        // Clean up deleted items
        // Foolproof method: Fetch existing IDs, calculate difference, and use standard .in() delete
        const { data: existingCompanies } = await supabase.from('companies').select('id');
        if (existingCompanies) {
            const keepIds = new Set(companies.map(c => c.id));
            const deleteIds = existingCompanies.map(c => c.id).filter(id => !keepIds.has(id));
            if (deleteIds.length > 0) await supabase.from('companies').delete().in('id', deleteIds);
        }

        const { data: existingGroups } = await supabase.from('groups').select('id');
        if (existingGroups) {
            const keepIds = new Set(groups.map(g => g.id));
            const deleteIds = existingGroups.map(g => g.id).filter(id => !keepIds.has(id));
            if (deleteIds.length > 0) await supabase.from('groups').delete().in('id', deleteIds);
        }

        const { data: existingUsers } = await supabase.from('users').select('id');
        if (existingUsers) {
            const keepIds = new Set(users.map(u => u.id));
            const deleteIds = existingUsers.map(u => u.id).filter(id => !keepIds.has(id));
            if (deleteIds.length > 0) await supabase.from('users').delete().in('id', deleteIds);
        }

    } catch (err) {
        console.error('Failed to save to Supabase:', err);
    }
}

// Used to initially populate the database if it's empty
export async function seedDatabaseToSupabase() {
    const seedData = createDefaultDatabase();
    await saveDatabaseToSupabase(seedData);
    return seedData;
}
