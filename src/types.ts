
export interface WrikeResponse<T> {
    kind: string,
    data: T[]
}

export interface WriteObject {
    id: string,
    accountId: string,
    permalink: string,
}

export type Task = {
    id: string,
    accountId: string,
    title: string,
    parentIds: string[],
    superParentIds: string[]
    status: string,
    importance: string,
    customStatusId: string,
    permalink: string,
    priority: string
}

export type Folder = {
    id: string,
    accountId: string,
    title: string,
    description: string,
    sharedIds: string[],
    parentIds: string[],
    childIds: string[],
    permalink: string,
    workflowId: string,
    project: Project
}

export type Project = {
    authorId: string,
    ownerIds: string[],
    customStatusId: string,
    createDate: string,
    completeDate: string
}
