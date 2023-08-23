import { EmbedBuilder, Guild, GuildMember, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { createCommand, getUser } from '../../app/app';
import { getLeaderboard } from '../../repositories/leaderboard';
import LeaderboardModel from '../../models/leaderboard';

export const leaderboard = createCommand({
    permissions: [],

    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Shows a leaderboard of active users in this server')
        .addSubcommand((option) => option
            .setName('remove')
            .setDescription('Removes a user from the leaderboard')
            .addUserOption((option) => option
                .setName('member')
                .setDescription('Provide a user')
                .setRequired(true),
            ),
        )
        .addSubcommand((option) => option
            .setName('view')
            .setDescription('Shows the leaderboard stats'),
        ),

    cb: async (app, interaction) => {
        const member = interaction.member as GuildMember;
        const guild = interaction.guild as Guild;

        switch (interaction.options.getSubcommand()) {
            case 'remove':
                const permissions = [
                    PermissionsBitField.Flags.Administrator,
                ];

                if (!member.permissions.has(permissions)) {
                    await interaction.reply({
                        content: 'Sorry, you have insufficient permissions to use this command',
                        ephemeral: true,
                    });

                    return;
                }

                const memberOption = interaction.options.getMember('member') as GuildMember;

                LeaderboardModel.findOneAndDelete({
                    guildId: guild.id,
                    userId: memberOption.id,
                });

                await interaction.reply('Leaderboard entry has been successfully removed');
                break;
            case 'view':
                const leaderboard = await getLeaderboard(guild.id);

                const members = [];
                const points = [];

                for (const { userId, points: _points } of leaderboard.entries) {
                    const user = await getUser(app.client, userId);

                    if (user && _points > 0) {
                        members.push(user.tag);
                        points.push(_points);
                    }
                }

                const membersList = members
                    .map((username, i) => `${i + 1} - ${username}`)
                    .join('\n\n');

                const pointsList = points.join('\n\n');

                const embed = new EmbedBuilder()
                    .setTitle('Leaderboard')
                    .setDescription('The list of the most active members of this server')
                    .setTimestamp()
                    .setFields([
                        {
                            name: 'Members',
                            value: membersList || '-',
                            inline: true,
                        },
                        {
                            name: 'Points',
                            value: pointsList || '-',
                            inline: true,
                        },
                    ]);

                await interaction.reply({ embeds: [embed] });
                break;
        }
    },
});