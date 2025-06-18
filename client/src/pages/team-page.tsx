import { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { User, ClientTeamAssignment, Client } from "@shared/schema.ts";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Users, UserPlus, Building, Mail, Phone, MapPin, Calendar, Edit, Trash2, MoreHorizontal, Shield, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TeamAssignmentForm } from "@/components/forms/team-assignment-form";
import { formatClientName } from "@/lib/utils";

// Form schemas
const teamMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "manager", "engineer", "user"]),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const assignmentSchema = z.object({
  userId: z.string().min(1, "Please select a team member"),
  clientId: z.string().min(1, "Please select a client"),
  role: z.string().min(1, "Please specify the role"),
});

interface TeamMember {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [isNewAssignmentOpen, setIsNewAssignmentOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  
  const { toast } = useToast();

  const { data: users = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: teamAssignments = [], isLoading: isLoadingAssignments, refetch: refetchAssignments } = useQuery<ClientTeamAssignment[]>({
    queryKey: ["/api/team-assignments"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Forms
  const addMemberForm = useForm<z.infer<typeof teamMemberSchema>>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "user",
      username: "",
      password: "",
    },
  });

  const assignmentForm = useForm<z.infer<typeof assignmentSchema>>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      userId: "",
      clientId: "",
      role: "",
    },
  });

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch team members');
      
      const data = await response.json();
      setTeamMembers(data);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = 
      member.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      engineer: 'bg-green-100 text-green-800',
      user: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={colors[role] || 'bg-gray-100 text-gray-800'}>
        {role}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const handleAddTeamMember = () => {
    setIsAddMemberOpen(true);
  };

  const handleEditTeamMember = (memberId: string) => {
    const member = users.find(u => u.id.toString() === memberId);
    if (member) {
      addMemberForm.reset({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        email: member.email,
        role: member.role as "admin" | "manager" | "engineer" | "user",
        username: member.username,
        password: "", // Don't pre-fill password for security
      });
      setSelectedMemberId(memberId);
      setIsEditMemberOpen(true);
    }
  };

  const handleDeleteTeamMember = async (memberId: string) => {
    if (confirm('Are you sure you want to delete this team member? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/users/${memberId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (response.ok) {
          // Refetch team members to update the list
          await fetchTeamMembers();
          toast({
            title: "Success",
            description: "Team member has been removed successfully."
          });
        } else if (response.status === 403) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to delete this team member.",
            variant: "destructive"
          });
        } else {
          throw new Error('Delete failed');
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete team member. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleViewProfile = (memberId: string) => {
    // Navigate to user profile page
    window.location.href = `/profile/${memberId}`;
  };

  const handleSendMessage = (memberId: string) => {
    // Open messaging interface - could be a modal or navigate to messages
    const member = teamMembers.find(m => m.id.toString() === memberId);
    if (member) {
      // Option 1: Navigate to messaging page
      window.location.href = `/messages?to=${member.email}`;
      
      // Option 2: Alternative - open email client
      // window.location.href = `mailto:${member.email}?subject=MSSP Team Communication`;
      
      toast({
        title: "Opening Messages",
        description: `Starting conversation with ${member.firstName} ${member.lastName}`
      });
    }
  };

  const handleNewAssignment = () => {
    setIsNewAssignmentOpen(true);
  };

  const handleEditAssignment = (assignmentId: string) => {
    const assignment = teamAssignments.find(a => a.id.toString() === assignmentId);
    if (assignment) {
      assignmentForm.reset({
        userId: assignment.userId.toString(),
        clientId: assignment.clientId.toString(),
        role: assignment.role,
      });
      setSelectedAssignmentId(assignmentId);
      setIsNewAssignmentOpen(true); // Reuse the same form for editing
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (confirm('Are you sure you want to remove this assignment?')) {
      try {
        const response = await fetch(`/api/team-assignments/${assignmentId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (response.ok) {
          // Refetch assignments to update the list
          refetchAssignments();
          toast({
            title: "Assignment Removed",
            description: "Team assignment has been removed successfully."
          });
        } else {
          throw new Error('Delete assignment failed');
        }
      } catch (error) {
        toast({
          title: "Error", 
          description: "Failed to remove assignment. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const onAddMemberSubmit = async (data: z.infer<typeof teamMemberSchema>) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team member added successfully!",
        });
        setIsAddMemberOpen(false);
        addMemberForm.reset();
        refetchUsers();
      } else {
        throw new Error('Failed to add team member');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add team member. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onAssignmentSubmit = async (data: z.infer<typeof assignmentSchema>) => {
    try {
      const response = await fetch('/api/team-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          userId: parseInt(data.userId),
          clientId: parseInt(data.clientId),
          assignedDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Assignment created successfully!",
        });
        setIsNewAssignmentOpen(false);
        assignmentForm.reset();
        refetchAssignments();
      } else {
        throw new Error('Failed to create assignment');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create assignment. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AppLayout 
      title="Team Management" 
      subtitle="Manage team members and client assignments"
    >
      <main className="flex-1 overflow-auto p-6 pt-16 md:pt-6">
        <Tabs defaultValue="team" className="space-y-6">
          <TabsList>
            <TabsTrigger value="team">Team Members</TabsTrigger>
            <TabsTrigger value="assignments">Client Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Team Members
                  </CardTitle>
                  <Button onClick={handleAddTeamMember}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Team Member
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamMembers.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {teamMembers.filter(m => m.isActive).length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Administrators</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {teamMembers.filter(m => m.role === 'admin').length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Engineers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {teamMembers.filter(m => m.role === 'engineer').length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search team members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="px-3 py-2 border rounded-md"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="engineer">Engineer</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                </div>

                {filteredMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No team members found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMembers.map((member) => (
                      <Card key={member.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-lg font-semibold">
                                  {member.firstName?.[0]}{member.lastName?.[0]}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-semibold">
                                  {member.firstName} {member.lastName}
                                </h3>
                                <p className="text-sm text-muted-foreground">@{member.username}</p>
                              </div>
                            </div>
                            {getStatusBadge(member.isActive)}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              {getRoleBadge(member.role)}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <a href={`mailto:${member.email}`} className="hover:underline">
                                {member.email}
                              </a>
                            </div>
                            {member.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <a href={`tel:${member.phone}`} className="hover:underline">
                                  {member.phone}
                                </a>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2 mt-4 pt-4 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleEditTeamMember(member.id.toString())}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => window.location.href = `/clients?assignedTo=${member.id}`}
                            >
                              View Clients
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Client Assignments
                  </CardTitle>
                  <Button onClick={handleNewAssignment}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Assignment
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team Member</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Assigned Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingAssignments ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Loading assignments...
                          </TableCell>
                        </TableRow>
                      ) : (teamAssignments || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="flex flex-col items-center space-y-2">
                              <Building className="h-8 w-8 text-gray-400" />
                              <p className="text-gray-500">No assignments found</p>
                              <p className="text-sm text-gray-400">
                                Create your first team assignment to get started
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        (teamAssignments || []).map((assignment) => {
                          const user = (users || []).find(u => u.id === assignment.userId);
                          return (
                            <TableRow key={assignment.id}>
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-blue-600">
                                      {user?.firstName?.charAt(0) || ""}{user?.lastName?.charAt(0) || ""}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium">{user?.firstName || ""} {user?.lastName || ""}</p>
                                    <p className="text-sm text-gray-500">{user?.email || ""}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="font-medium">{getClientName(assignment.clientId)}</p>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {assignment.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-500">
                                  {new Date(assignment.assignedDate).toLocaleDateString()}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditAssignment(assignment.id.toString())}>
                                    Edit
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteAssignment(assignment.id.toString())}>
                                    Remove
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Team Member Modal */}
        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Add a new team member to your organization.
              </DialogDescription>
            </DialogHeader>
            <Form {...addMemberForm}>
              <form onSubmit={addMemberForm.handleSubmit(onAddMemberSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addMemberForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addMemberForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={addMemberForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe@company.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addMemberForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addMemberForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addMemberForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="engineer">Engineer</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Member</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* New Assignment Modal */}
        <Dialog open={isNewAssignmentOpen} onOpenChange={setIsNewAssignmentOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{selectedAssignmentId ? "Edit Assignment" : "New Assignment"}</DialogTitle>
              <DialogDescription>
                {selectedAssignmentId ? "Update the team assignment details." : "Assign a team member to a client."}
              </DialogDescription>
            </DialogHeader>
            <Form {...assignmentForm}>
              <form onSubmit={assignmentForm.handleSubmit(onAssignmentSubmit)} className="space-y-4">
                <FormField
                  control={assignmentForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Member</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstName} {user.lastName} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignmentForm.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {formatClientName(client)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignmentForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignment Role</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Primary Contact, Technical Lead" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsNewAssignmentOpen(false);
                    setSelectedAssignmentId(null);
                    assignmentForm.reset();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {selectedAssignmentId ? "Update Assignment" : "Create Assignment"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>
    </AppLayout>
  );
}
