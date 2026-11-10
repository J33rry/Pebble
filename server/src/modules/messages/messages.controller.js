import { asyncHandler } from "../../lib/asyncHandler.js";
import * as messagesService from "./messages.service.js";
import * as v from "./messages.validation.js";
import { toMessageResponse } from "./messages.mapper.js";
import { broadcastToChat } from "../../ws/connectionRegistry.js";

export const getMessages = asyncHandler(async (req, res) => {
    const pagination = v.paginationSchema.parse(req.query);
    const rawMessages = await messagesService.getMessages(
        req.params.chatId,
        pagination,
    );

    const messages = rawMessages.map(toMessageResponse);

    res.json({ messages });
});

export const sendMessage = asyncHandler(async (req, res) => {
    const body = v.sendMessageSchema.parse(req.body);
    const { message: rawMessage, created } = await messagesService.sendMessage(
        req.params.chatId,
        req.user.id,
        body,
    );

    const message = toMessageResponse(rawMessage);

    if (created) {
        broadcastToChat(req.params.chatId, {
            type: "message:new",
            payload: message,
        }, req.user.id);
    }

    res.status(created ? 201 : 200).json({ message });
});

export const editMessage = asyncHandler(async (req, res) => {
    const { content } = v.editMessageSchema.parse(req.body);
    const message = await messagesService.editMessage(
        req.params.chatId,
        req.params.messageId,
        req.user.id,
        content,
    );

    broadcastToChat(req.params.chatId, {
        type: "message:edit",
        payload: message,
    }, req.user.id);

    res.json({ message });
});

export const deleteMessage = asyncHandler(async (req, res) => {
    const message = await messagesService.deleteMessage(
        req.params.chatId,
        req.params.messageId,
        req.user.id,
    );

    broadcastToChat(req.params.chatId, {
        type: "message:delete",
        payload: { id: req.params.messageId, chatId: req.params.chatId },
    }, req.user.id);

    res.json({ message });
});

export const addReaction = asyncHandler(async (req, res) => {
    const { reaction } = v.addReactionSchema.parse(req.body);
    const result = await messagesService.addReaction(
        req.params.chatId,
        req.params.messageId,
        req.user.id,
        reaction,
    );

    broadcastToChat(req.params.chatId, {
        type: "message:reaction",
        payload: {
            messageId: req.params.messageId,
            userId: req.user.id,
            reaction,
            action: "add",
        },
    }, req.user.id);

    res.status(201).json({ reaction: result });
});

export const removeReaction = asyncHandler(async (req, res) => {
    const { reaction } = v.removeReactionSchema.parse(req.body);
    await messagesService.removeReaction(
        req.params.chatId,
        req.params.messageId,
        req.user.id,
        reaction,
    );

    broadcastToChat(req.params.chatId, {
        type: "message:reaction",
        payload: {
            messageId: req.params.messageId,
            userId: req.user.id,
            reaction,
            action: "remove",
        },
    }, req.user.id);

    res.status(204).end();
});

export const markRead = asyncHandler(async (req, res) => {
    const { messageIds } = v.markReadSchema.parse(req.body);
    await messagesService.markRead(req.params.chatId, messageIds, req.user.id);

    broadcastToChat(req.params.chatId, {
        type: "message:status",
        payload: {
            chatId: req.params.chatId,
            messageIds,
            userId: req.user.id,
            status: "read",
        },
    }, req.user.id);

    res.json({ message: "Marked as read" });
});
